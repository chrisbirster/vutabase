package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/json"
	"encoding/hex"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type stripeAPIErrorResponse struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

type stripeEventEnvelope struct {
	ID   string `json:"id"`
	Type string `json:"type"`
	Data struct {
		Object json.RawMessage `json:"object"`
	} `json:"data"`
}

func appendURLQuery(raw string, values map[string]string) string {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || parsed == nil {
		return raw
	}
	query := parsed.Query()
	for key, value := range values {
		if strings.TrimSpace(value) == "" {
			continue
		}
		query.Set(key, value)
	}
	parsed.RawQuery = strings.ReplaceAll(query.Encode(), url.QueryEscape("{CHECKOUT_SESSION_ID}"), "{CHECKOUT_SESSION_ID}")
	return parsed.String()
}

func verifyStripeWebhookSignature(payload []byte, signatureHeader, secret string, now time.Time) error {
	signatureHeader = strings.TrimSpace(signatureHeader)
	secret = strings.TrimSpace(secret)
	if signatureHeader == "" || secret == "" {
		return fmt.Errorf("missing stripe webhook signature")
	}

	var timestamp string
	signatures := make([]string, 0, 2)
	for _, part := range strings.Split(signatureHeader, ",") {
		part = strings.TrimSpace(part)
		switch {
		case strings.HasPrefix(part, "t="):
			timestamp = strings.TrimPrefix(part, "t=")
		case strings.HasPrefix(part, "v1="):
			signatures = append(signatures, strings.TrimPrefix(part, "v1="))
		}
	}
	if timestamp == "" || len(signatures) == 0 {
		return fmt.Errorf("invalid stripe signature header")
	}

	issuedAt, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid stripe signature timestamp")
	}
	if now.Sub(time.Unix(issuedAt, 0)) > 5*time.Minute || time.Unix(issuedAt, 0).Sub(now) > 5*time.Minute {
		return fmt.Errorf("stripe webhook signature expired")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(timestamp))
	mac.Write([]byte("."))
	mac.Write(payload)
	expected := mac.Sum(nil)

	for _, signature := range signatures {
		decoded, err := hex.DecodeString(signature)
		if err != nil {
			continue
		}
		if hmac.Equal(decoded, expected) {
			return nil
		}
	}
	return fmt.Errorf("invalid stripe webhook signature")
}
