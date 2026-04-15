package main

import (
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var htmlPolicy = bluemonday.UGCPolicy()

func sanitizeHTML(input string) string {
	return htmlPolicy.Sanitize(strings.TrimSpace(input))
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}
