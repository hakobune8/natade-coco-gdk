package main

import (
	"context"
	"errors"
	"io/fs"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

var version = "dev"

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "game-static-web")
	if err := run(logger); err != nil {
		logger.Error("service stopped", "event", "service.error", "error", err.Error())
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	root := env("NATADECOCO_STATIC_ROOT", "/app/web")
	prefix := cleanPrefix(env("NATADECOCO_STATIC_PREFIX", "/games/gdk-reference/"))
	assets := os.DirFS(root)
	if _, err := fs.Stat(assets, "index.html"); err != nil {
		return errors.New("static root must contain index.html")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health)
	mux.HandleFunc("GET /readyz", health)
	mux.Handle(prefix, spa(prefix, assets))
	server := &http.Server{Addr: env("NATADECOCO_LISTEN_ADDRESS", ":8080"), Handler: headers(mux), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 16 << 10}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	errorsChannel := make(chan error, 1)
	go func() {
		logger.Info("service started", "event", "service.started", "version", version, "address", server.Addr)
		errorsChannel <- server.ListenAndServe()
	}()
	select {
	case err := <-errorsChannel:
		if !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	case <-ctx.Done():
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return server.Shutdown(shutdown)
	}
}

func spa(prefix string, assets fs.FS) http.Handler {
	server := http.FileServerFS(assets)
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		name := strings.TrimPrefix(strings.TrimPrefix(request.URL.Path, prefix), "/")
		if name == "" {
			name = "index.html"
		}
		if info, err := fs.Stat(assets, name); err != nil || info.IsDir() {
			name = "index.html"
		}
		clone := request.Clone(request.Context())
		clone.URL = cloneURL(request.URL)
		clone.URL.Path = "/" + name
		if name == "index.html" {
			clone.URL.Path = "/"
			response.Header().Set("Cache-Control", "no-cache")
		} else if strings.HasPrefix(name, "assets/") {
			response.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		server.ServeHTTP(response, clone)
	})
}

func headers(next http.Handler) http.Handler {
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		response.Header().Set("X-Content-Type-Options", "nosniff")
		response.Header().Set("Referrer-Policy", "no-referrer")
		response.Header().Set("X-Frame-Options", "DENY")
		next.ServeHTTP(response, request)
	})
}
func health(response http.ResponseWriter, _ *http.Request) {
	response.Header().Set("Content-Type", "application/json")
	_, _ = response.Write([]byte(`{"status":"ok"}`))
}
func cloneURL(value *url.URL) *url.URL { clone := *value; return &clone }
func cleanPrefix(value string) string {
	value = "/" + strings.Trim(value, "/")
	if value != "/" {
		value += "/"
	}
	return value
}
func env(name, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(name)); value != "" {
		return value
	}
	return fallback
}
