using SpaceExplorer.Api.Data;
using SpaceExplorer.Api.Security;

namespace SpaceExplorer.Api.Reports;

/// <summary>
/// Builds every page from the parsed entries, applying the user's visibility.
/// Sizes: a workspace is its jobs total line (never summed with its job lines), falling back to the sum of
/// its jobs when that line is missing; a compartment is the sum of its workspaces.
/// </summary>
public static class SpaceReports
{
    private static readonly StringComparer NameComparer = StringComparer.OrdinalIgnoreCase;

    public static IReadOnlyList<RawRow> Raw(IEnumerable<SpaceEntry> entries, UserAccess access) =>
        Visible(entries, access)
            .OrderBy(e => e.FullPath, NameComparer)
            .Select(e => new RawRow(e.FullPath, e.Size))
            .ToList();

    public static IReadOnlyList<SplitRow> Split(IEnumerable<SpaceEntry> entries, UserAccess access) =>
        Visible(entries, access)
            .OrderBy(e => e.Compartment, NameComparer)
            .ThenBy(e => e.Workspace, NameComparer)
            .ThenBy(e => e.Kind)
            .ThenBy(e => e.Job, NameComparer)
            .Select(e => new SplitRow(e.Compartment, e.Workspace, e.Job, e.Size))
            .ToList();

    public static IReadOnlyList<JobsTotalRow> JobsTotals(IEnumerable<SpaceEntry> entries, UserAccess access) =>
        Visible(entries, access)
            .Where(e => e.Kind == EntryKind.JobsTotal)
            .OrderBy(e => e.Compartment, NameComparer)
            .ThenBy(e => e.Workspace, NameComparer)
            .Select(e => new JobsTotalRow(e.Compartment, e.Workspace, e.Size))
            .ToList();

    /// <summary>
    /// Visible compartments one by one; every other compartment is merged into a single anonymous row
    /// so that the user can compare their consumption to the rest of the space.
    /// </summary>
    public static CompartmentReport Compartments(IEnumerable<SpaceEntry> entries, UserAccess access)
    {
        var tree = BuildTree(entries);
        var total = tree.Sum(c => c.Size);

        var rows = tree
            .Where(c => access.CanSee(c.Name))
            .Select(c => new CompartmentRow(c.Name, c.Size, Percent(c.Size, total), IsOthers: false))
            .ToList();

        var hidden = tree.Where(c => !access.CanSee(c.Name)).ToList();
        if (hidden.Count > 0)
        {
            var othersSize = hidden.Sum(c => c.Size);
            rows.Add(new CompartmentRow(null, othersSize, Percent(othersSize, total), IsOthers: true));
        }

        return new CompartmentReport(total, rows);
    }

    public static IReadOnlyList<CompartmentDetail> Workspaces(IEnumerable<SpaceEntry> entries, UserAccess access, bool includeJobs)
    {
        var tree = BuildTree(entries);
        var total = tree.Sum(c => c.Size);

        return tree
            .Where(c => access.CanSee(c.Name))
            .Select(c => new CompartmentDetail(
                c.Name,
                c.Size,
                Percent(c.Size, total),
                c.Workspaces
                    .Select(w => new WorkspaceRow(
                        w.Name,
                        w.Size,
                        Percent(w.Size, c.Size),
                        includeJobs ? w.Jobs.Select(j => new JobRow(j.Name, j.Size, Percent(j.Size, w.Size))).ToList() : null))
                    .ToList()))
            .ToList();
    }

    private static IEnumerable<SpaceEntry> Visible(IEnumerable<SpaceEntry> entries, UserAccess access) =>
        entries.Where(e => access.CanSee(e.Compartment));

    private static double Percent(long part, long whole) => whole == 0 ? 0 : part * 100.0 / whole;

    private sealed record JobNode(string Name, long Size);

    private sealed record WorkspaceNode(string Name, long Size, IReadOnlyList<JobNode> Jobs);

    private sealed record CompartmentNode(string Name, long Size, IReadOnlyList<WorkspaceNode> Workspaces);

    /// <summary>Whole space, every compartment, sorted by decreasing size at each level.</summary>
    private static IReadOnlyList<CompartmentNode> BuildTree(IEnumerable<SpaceEntry> entries) =>
        entries
            .GroupBy(e => e.Compartment, NameComparer)
            .Select(compartment =>
            {
                var workspaces = compartment
                    .GroupBy(e => e.Workspace, NameComparer)
                    .Select(workspace =>
                    {
                        var jobs = workspace
                            .Where(e => e.Kind == EntryKind.Job)
                            .Select(e => new JobNode(e.Job!, e.Size))
                            .OrderByDescending(j => j.Size)
                            .ToList();
                        var jobsTotal = workspace.FirstOrDefault(e => e.Kind == EntryKind.JobsTotal);
                        var size = jobsTotal?.Size ?? jobs.Sum(j => j.Size);
                        return new WorkspaceNode(workspace.First().Workspace, size, jobs);
                    })
                    .OrderByDescending(w => w.Size)
                    .ToList();
                return new CompartmentNode(compartment.First().Compartment, workspaces.Sum(w => w.Size), workspaces);
            })
            .OrderByDescending(c => c.Size)
            .ToList();
}
