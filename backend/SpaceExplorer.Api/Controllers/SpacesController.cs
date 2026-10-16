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
[Route("api/spaces")]
public sealed class SpacesController(
    IOptions<List<SpaceOptions>> spaces,
    ISpaceDataProvider dataProvider,
    UserAccess user) : ControllerBase
{
    [HttpGet]
    public IEnumerable<SpaceSummary> List() =>
        spaces.Value.Select(s => new SpaceSummary(s.Key, s.DisplayName));

    /// <summary>P1 — Données brutes</summary>
    [HttpGet("{key}/raw")]
    public Task<ActionResult<SpaceResponse<IReadOnlyList<RawRow>>>> Raw(string key, CancellationToken ct) =>
        Query(key, entries => SpaceReports.Raw(entries, user), ct);

    /// <summary>P2 — Données découpées</summary>
    [HttpGet("{key}/split")]
    public Task<ActionResult<SpaceResponse<IReadOnlyList<SplitRow>>>> Split(string key, CancellationToken ct) =>
        Query(key, entries => SpaceReports.Split(entries, user), ct);

    /// <summary>P3 — Totaux jobs</summary>
    [HttpGet("{key}/jobs-totals")]
    public Task<ActionResult<SpaceResponse<IReadOnlyList<JobsTotalRow>>>> JobsTotals(string key, CancellationToken ct) =>
        Query(key, entries => SpaceReports.JobsTotals(entries, user), ct);

    /// <summary>P4 — Compartiments</summary>
    [HttpGet("{key}/compartments")]
    public Task<ActionResult<SpaceResponse<CompartmentReport>>> Compartments(string key, CancellationToken ct) =>
        Query(key, entries => SpaceReports.Compartments(entries, user), ct);

    /// <summary>P5 — Workspaces par compartiment, P6 with <paramref name="includeJobs"/></summary>
    [HttpGet("{key}/workspaces")]
    public Task<ActionResult<SpaceResponse<IReadOnlyList<CompartmentDetail>>>> Workspaces(
        string key, [FromQuery] bool includeJobs, CancellationToken ct) =>
        Query(key, entries => SpaceReports.Workspaces(entries, user, includeJobs), ct);

    private async Task<ActionResult<SpaceResponse<T>>> Query<T>(
        string key, Func<IReadOnlyList<SpaceEntry>, T> build, CancellationToken ct)
    {
        var space = spaces.Value.FirstOrDefault(s => s.Key.Equals(key, StringComparison.OrdinalIgnoreCase));
        if (space is null)
        {
            return Problem(statusCode: StatusCodes.Status404NotFound, title: $"Espace inconnu : {key}");
        }

        var data = await dataProvider.GetAsync(space, ct);
        return new SpaceResponse<T>(space.Key, space.DisplayName, data.FileDateUtc, data.Stale, build(data.Entries));
    }
}
