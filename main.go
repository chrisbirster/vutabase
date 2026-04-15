package main

import (
	"embed"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
)

//go:embed all:web/dist
var embeddedWebDist embed.FS

func main() {
	cfg, err := LoadAppConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	store, err := OpenStore(cfg.Database)
	if err != nil {
		log.Fatalf("failed to open data store: %v", err)
	}
	defer store.Close()

	handler := NewAPIHandlerWithConfig(store, cfg, NewEmailSender(cfg))

	frontendFS, err := fs.Sub(embeddedWebDist, "web/dist")
	if err != nil {
		log.Fatalf("failed to load embedded app assets: %v; build the app with `bun --cwd web run build` first", err)
	}

	server := NewServer(cfg, handler, frontendFS)
	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	appURL := cfg.AppOrigin
	if os.Getenv("PORT") == "" {
		appURL = "http://localhost:" + cfg.Port
	}

	log.Printf("starting %s server", cfg.AppName)
	log.Printf("environment=%s database_mode=%s addr=%s", cfg.Environment, cfg.Database.Mode, addr)
	log.Printf("app available at %s", appURL)

	if err := http.ListenAndServe(addr, server); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
