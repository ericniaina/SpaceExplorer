namespace SpaceExplorer.Api.Data;

public enum EntryKind
{
    /// <summary>Line ending at <c>\jobs</c>: total size of all the jobs of a workspace.</summary>
    JobsTotal,

    /// <summary>Line ending at <c>\jobs\[JobName]</c>: size of a single job.</summary>
    Job,
}

/// <summary>One parsed CSV line: <c>[BasePath]\[Compartment]\[Workspace]\jobs[\JobName];size</c>.</summary>
public sealed record SpaceEntry(string FullPath, string Compartment, string Workspace, string? Job, long Size)
{
    public EntryKind Kind => Job is null ? EntryKind.JobsTotal : EntryKind.Job;
}
