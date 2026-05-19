package com.iflytek.skillhub.auth.policy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.springframework.http.HttpMethod;
import java.util.Set;
import org.junit.jupiter.api.Test;

class RouteSecurityPolicyRegistryTest {

    private final RouteSecurityPolicyRegistry registry = new RouteSecurityPolicyRegistry();

    @Test
    void authorizeApiToken_requiresPublishScopeForPublishEndpoints() {
        var denied = registry.authorizeApiToken("POST", "/api/web/skills/global/publish", Set.of("skill:read"));
        var allowed = registry.authorizeApiToken("POST", "/api/web/skills/global/publish", Set.of("skill:publish"));

        assertFalse(denied.allowed());
        assertEquals("skill:publish", denied.requiredScope());
        assertTrue(allowed.allowed());
    }

    @Test
    void authorizeApiToken_requiresDeleteScopeForHardDeleteEndpoint() {
        var denied = registry.authorizeApiToken("DELETE", "/api/v1/skills/global/demo-skill", Set.of("skill:publish"));
        var allowed = registry.authorizeApiToken("DELETE", "/api/v1/skills/global/demo-skill", Set.of("skill:delete"));

        assertFalse(denied.allowed());
        assertEquals("skill:delete", denied.requiredScope());
        assertTrue(allowed.allowed());
    }

    @Test
    void authorizationPolicies_shouldDeclareSuperAdminDeleteRuleForHardDeleteEndpoint() {
        boolean matched = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.DELETE
                        && "/api/v1/skills/*/*".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.ROLE_PROTECTED
                        && Set.of(policy.roles()).contains("SUPER_ADMIN"));

        assertTrue(matched);
    }

    @Test
    void authorizationPolicies_shouldKeepPublicLabelsEndpointsAnonymous() {
        boolean matchedV1 = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.GET
                        && "/api/v1/labels".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.PERMIT_ALL);
        boolean matchedWeb = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.GET
                        && "/api/web/labels".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.PERMIT_ALL);

        assertTrue(matchedV1);
        assertTrue(matchedWeb);
    }

    @Test
    void authorizationPolicies_shouldRequireAuthenticationForNamespaceDiscovery() {
        boolean matchedV1 = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.GET
                        && "/api/v1/namespaces".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.AUTHENTICATED);
        boolean matchedWeb = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.GET
                        && "/api/web/namespaces".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.AUTHENTICATED);

        assertTrue(matchedV1);
        assertTrue(matchedWeb);
    }

    @Test
    void apiTokenPolicySupportsNativeCliRoutes() {
        assertTrue(registry.authorizeApiToken("GET", "/api/cli/v1/auth/whoami", Set.of()).allowed());
        assertTrue(registry.authorizeApiToken("GET", "/api/cli/v1/skills/search", Set.of()).allowed());
        assertTrue(registry.authorizeApiToken("GET", "/api/cli/v1/skills/global/demo/resolve", Set.of()).allowed());
        assertFalse(registry.authorizeApiToken("POST", "/api/cli/v1/skills/global/publish", Set.of()).allowed());
        assertTrue(registry.authorizeApiToken("POST", "/api/cli/v1/skills/global/publish", Set.of("skill:publish")).allowed());
        assertTrue(registry.authorizeApiToken("DELETE", "/api/cli/v1/skills/global/demo", Set.of("skill:delete")).allowed());
    }

    @Test
    void routeAuthorizationProtectsNativeCliRemoteDeleteByAuthenticationNotSuperAdminRole() {
        boolean matched = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.DELETE
                        && "/api/cli/v1/skills/*/*".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.AUTHENTICATED);

        assertTrue(matched);
    }

    @Test
    void mediaRoutesHaveExplicitAuthorizationPolicies() {
        boolean publicRead = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.GET
                        && "/api/v1/media/*".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.PERMIT_ALL);
        boolean uploadRequiresAuth = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.POST
                        && "/api/v1/media".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.AUTHENTICATED);
        boolean versionRead = registry.authorizationPolicies().stream()
                .anyMatch(policy -> policy.method() == HttpMethod.GET
                        && "/api/web/skills/*/*/versions/*/media".equals(policy.pattern())
                        && policy.accessLevel() == RouteSecurityPolicyRegistry.AccessLevel.PERMIT_ALL);

        assertTrue(publicRead);
        assertTrue(uploadRequiresAuth);
        assertTrue(versionRead);
    }

    @Test
    void apiTokenPolicyRequiresPublishScopeForMediaWrites() {
        assertTrue(registry.authorizeApiToken("GET", "/api/v1/media/42", Set.of()).allowed());

        var denied = registry.authorizeApiToken("POST", "/api/v1/media", Set.of("skill:read"));
        var versionDenied = registry.authorizeApiToken(
                "POST", "/api/web/skills/team/demo/versions/1.0.0/media", Set.of("skill:read"));

        assertFalse(denied.allowed());
        assertEquals("skill:publish", denied.requiredScope());
        assertFalse(versionDenied.allowed());
        assertEquals("skill:publish", versionDenied.requiredScope());
        assertTrue(registry.authorizeApiToken("POST", "/api/v1/media", Set.of("skill:publish")).allowed());
    }

    @Test
    void shouldIgnoreCsrf_forBearerAndApiPaths() {
        assertTrue(registry.shouldIgnoreCsrf("/api/v1/admin/users", null));
        assertTrue(registry.shouldIgnoreCsrf("/not-api", "Bearer token"));
        assertFalse(registry.shouldIgnoreCsrf("/ui/settings", null));
    }

    @Test
    void shouldProjectRequestContext_onlyForApiRoutes() {
        assertTrue(registry.shouldProjectRequestContext("/api/web/namespaces/team-a"));
        assertFalse(registry.shouldProjectRequestContext("/assets/index.css"));
    }
}
