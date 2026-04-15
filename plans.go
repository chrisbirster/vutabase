package main

import (
	"net/http"
	"strings"
)

const planOverrideHeader = "X-App-Plan"

var planLimits = map[Plan]PlanLimits{
	PlanGuest: {
		MaxMembers:    1,
		MaxWorkspaces: 1,
	},
	PlanFree: {
		MaxMembers:    1,
		MaxWorkspaces: 1,
	},
	PlanPro: {
		MaxMembers:    1,
		MaxWorkspaces: 3,
	},
	PlanTeam: {
		MaxMembers:    25,
		MaxWorkspaces: 10,
	},
	PlanEnterprise: {
		MaxMembers:    250,
		MaxWorkspaces: 100,
	},
}

func parsePlan(raw string) Plan {
	switch Plan(strings.ToLower(strings.TrimSpace(raw))) {
	case PlanGuest:
		return PlanGuest
	case PlanFree:
		return PlanFree
	case PlanTeam:
		return PlanTeam
	case PlanEnterprise:
		return PlanEnterprise
	default:
		return PlanPro
	}
}

func defaultPlan() Plan {
	value := lookupEnv("APP_DEFAULT_PLAN")
	if value == "" {
		return PlanFree
	}
	return parsePlan(value)
}

func entitlementsForPlan(plan Plan, usage EntitlementUsage, billingEnabled bool) Entitlements {
	limits, ok := planLimits[plan]
	if !ok {
		plan = PlanPro
		limits = planLimits[plan]
	}

	return Entitlements{
		Plan:   plan,
		Limits: limits,
		Usage:  usage,
		Features: EntitlementFeatures{
			OTPAuth: true,
			Billing: billingEnabled,
			Teams:   plan == PlanTeam || plan == PlanEnterprise,
		},
	}
}

func resolvePlanFromRequest(r *http.Request, session *SessionRecord) Plan {
	override := strings.TrimSpace(r.Header.Get(planOverrideHeader))
	if override != "" {
		return parsePlan(override)
	}
	if session != nil && session.Plan != "" {
		return session.Plan
	}
	return defaultPlan()
}
