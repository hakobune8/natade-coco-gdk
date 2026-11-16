package fixtures

import (
    "context"
    "crypto/tls"
    "database/sql"
    "html/template"
    "net/http"
    "os/exec"
)

func dangerous(req *http.Request, db *sql.DB) {
    // ruleid: natadecoco.go-tls-verification-disabled
    _ = tls.Config{InsecureSkipVerify: true}
    command := req.FormValue("command")
    // ruleid: natadecoco.go-input-to-shell
    exec.Command("sh", "-c", command)
    // ruleid: natadecoco.go-input-to-shell
    exec.CommandContext(context.Background(), "bash", "-c", command)
    query := "SELECT * FROM games WHERE name = '" + req.FormValue("name") + "'"
    // ruleid: natadecoco.go-input-to-sql
    db.Query(query)
    // ruleid: natadecoco.go-input-to-html
    _ = template.HTML(req.URL.Query().Get("html"))
}

func safe(req *http.Request, db *sql.DB) {
    // ok: natadecoco.go-tls-verification-disabled
    _ = tls.Config{MinVersion: tls.VersionTLS12}
    // ok: natadecoco.go-input-to-shell
    exec.Command("/usr/bin/printf", "%s", req.FormValue("command"))
    // ok: natadecoco.go-input-to-sql
    db.Query("SELECT * FROM games WHERE name = ?", req.FormValue("name"))
    // ok: natadecoco.go-input-to-html
    _ = template.HTMLEscapeString(req.FormValue("html"))
}
