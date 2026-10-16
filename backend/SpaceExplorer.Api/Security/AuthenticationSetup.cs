using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using SpaceExplorer.Api.Configuration;

namespace SpaceExplorer.Api.Security;

public static class AuthenticationSetup
{
    private static readonly string[] DefaultScopes = ["openid", "profile"];

    /// <summary>
    /// OIDC mode: backend-for-frontend. The API is the OIDC client and keeps the session in an HttpOnly cookie;
    /// tokens are never exposed to JavaScript. Development mode: fake user from configuration.
    /// </summary>
    public static IServiceCollection AddSpaceExplorerAuthentication(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var section = configuration.GetSection(AuthenticationSettings.Section);
        services.Configure<AuthenticationSettings>(section);
        var settings = section.Get<AuthenticationSettings>() ?? new AuthenticationSettings();

        if (settings.Mode == AuthenticationMode.Development)
        {
            if (!environment.IsDevelopment())
            {
                throw new InvalidOperationException("Authentication:Mode 'Development' is only allowed in the Development environment.");
            }

            services.AddAuthentication(DevAuthenticationHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, DevAuthenticationHandler>(DevAuthenticationHandler.SchemeName, null);
            return services;
        }

        var oidc = settings.Oidc;
        if (string.IsNullOrWhiteSpace(oidc.Authority) || string.IsNullOrWhiteSpace(oidc.ClientId))
        {
            throw new InvalidOperationException("Authentication:Oidc:Authority and Authentication:Oidc:ClientId are required.");
        }

        services.AddAuthentication(options =>
            {
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                // Challenges go through the cookie scheme so that /api calls get a 401 instead of an SSO redirect.
                options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            })
            .AddCookie(options =>
            {
                options.Cookie.Name = "SpaceExplorer.Auth";
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.LoginPath = "/auth/login";
                options.ReturnUrlParameter = "returnUrl";
                options.ExpireTimeSpan = TimeSpan.FromHours(8);
                options.SlidingExpiration = true;
                options.Events.OnRedirectToLogin = context => StatusCodeForApi(context, StatusCodes.Status401Unauthorized);
                options.Events.OnRedirectToAccessDenied = context => StatusCodeForApi(context, StatusCodes.Status403Forbidden);
            })
            .AddOpenIdConnect(options =>
            {
                options.Authority = oidc.Authority;
                options.ClientId = oidc.ClientId;
                options.ClientSecret = oidc.ClientSecret;
                options.ResponseType = OpenIdConnectResponseType.Code;
                options.UsePkce = true;
                // Kept inside the encrypted cookie, needed as id_token_hint for SSO logout.
                options.SaveTokens = true;
                options.GetClaimsFromUserInfoEndpoint = true;
                options.MapInboundClaims = false;

                options.Scope.Clear();
                foreach (var scope in oidc.Scopes.Length > 0 ? oidc.Scopes : DefaultScopes)
                {
                    options.Scope.Add(scope);
                }

                options.TokenValidationParameters.NameClaimType = oidc.NameClaim;
                options.TokenValidationParameters.RoleClaimType = oidc.GroupClaim;
                options.ClaimActions.MapUniqueJsonKey(oidc.NameClaim, oidc.NameClaim);
                // Single value or JSON array: MapJsonKey adds one claim per array item.
                options.ClaimActions.MapJsonKey(oidc.GroupClaim, oidc.GroupClaim);
            });

        return services;
    }

    private static Task StatusCodeForApi(RedirectContext<CookieAuthenticationOptions> context, int statusCode)
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            context.Response.StatusCode = statusCode;
        }
        else
        {
            context.Response.Redirect(context.RedirectUri);
        }

        return Task.CompletedTask;
    }
}
