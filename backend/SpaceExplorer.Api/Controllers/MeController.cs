using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SpaceExplorer.Api.Configuration;
using SpaceExplorer.Api.Data;
using SpaceExplorer.Api.Reports;
using SpaceExplorer.Api.Security;

namespace SpaceExplorer.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/me")]
public sealed class MeController(
    IOptions<List<SpaceOptions>> spaces,
    ISpaceDataProvider dataProvider,
    UserAccess user) : ControllerBase
{
    /// <summary>Current user and the compartments they can see, as found in the loaded spaces.</summary>
    [HttpGet]
    public async Task<MeResponse> Get(CancellationToken ct)
    {
        var compartments = new SortedSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var space in spaces.Value)
        {
            try
            {
                var data = await dataProvider.GetAsync(space, ct);
                compartments.UnionWith(data.Entries.Select(e => e.Compartment).Where(user.CanSee));
            }
            catch (SpaceDataUnavailableException)
            {
                // Identity must stay available even when a share is down.
            }
        }

        return new MeResponse(user.UserName, user.IsAdmin, compartments.ToList());
    }
}
