using System.Text.Json.Serialization;

namespace SpaceExplorer.Api.Reports;

/// <summary>Common envelope of every space page.</summary>
public sealed record SpaceResponse<T>(string SpaceKey, string SpaceName, DateTime FileDateUtc, bool Stale, T Data);

public sealed record SpaceSummary(string Key, string DisplayName);

public sealed record MeResponse(string UserName, bool IsAdmin, IReadOnlyList<string> Compartments);

/// <summary>P1</summary>
public sealed record RawRow(string Path, long Size);

/// <summary>P2. <see cref="Job"/> is null on the jobs total line of a workspace.</summary>
public sealed record SplitRow(string Compartment, string Workspace, string? Job, long Size);

/// <summary>P3</summary>
public sealed record JobsTotalRow(string Compartment, string Workspace, long Size);

/// <summary>P4. <see cref="Percent"/> is relative to the whole space.</summary>
public sealed record CompartmentReport(long SpaceTotal, IReadOnlyList<CompartmentRow> Rows);

/// <summary><see cref="Name"/> is null on the aggregated "other compartments" row.</summary>
public sealed record CompartmentRow(string? Name, long Size, double Percent, bool IsOthers);

/// <summary>P5 / P6. <see cref="PercentOfSpace"/> is relative to the whole space.</summary>
public sealed record CompartmentDetail(string Name, long Size, double PercentOfSpace, IReadOnlyList<WorkspaceRow> Workspaces);

/// <summary><see cref="Percent"/> is relative to the compartment. <see cref="Jobs"/> only on P6.</summary>
public sealed record WorkspaceRow(
    string Name,
    long Size,
    double Percent,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] IReadOnlyList<JobRow>? Jobs);

/// <summary><see cref="Percent"/> is relative to the workspace.</summary>
public sealed record JobRow(string Name, long Size, double Percent);
