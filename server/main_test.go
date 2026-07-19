package main

import "testing"

func TestCleanPrefix(t *testing.T) {
	if got := cleanPrefix("games/gdk-reference"); got != "/games/gdk-reference/" {
		t.Fatalf("unexpected prefix %q", got)
	}
}
