using System.Collections.Concurrent;
using System.Text;
using Microsoft.Extensions.Options;
using SpaceExplorer.Api.Configuration;

namespace SpaceExplorer.Api.Data;

/// <summary>Parsed content of a space CSV.</summary>
/// <param name="Stale">True when the file could not be re-read and the last loaded content is served instead.</param>
public sealed record SpaceData(IReadOnlyList<SpaceEntry> Entries, DateTime FileDateUtc, bool Stale);

public interface ISpaceDataProvider
{
    /// <exception cref="SpaceDataUnavailableException">The file was never loaded successfully.</exception>
    Task<SpaceData> GetAsync(SpaceOptions space, CancellationToken cancellationToken);
}

public sealed class SpaceDataUnavailableException(string spaceKey, Exception inner)
    : Exception($"Data of space '{spaceKey}' is unavailable.", inner)
{
    public string SpaceKey { get; } = spaceKey;
}

/// <summary>
/// Keeps each space CSV in memory. The file is re-read only when its modification date changes,
/// and that date is checked at most once per <see cref="DataRefreshOptions.CheckIntervalMinutes"/>.
/// </summary>
public sealed class SpaceDataCache(
    IOptionsMonitor<DataRefreshOptions> refreshOptions,
    TimeProvider timeProvider,
    ILogger<SpaceDataCache> logger) : ISpaceDataProvider
{
    private const int MaxLoggedSkippedLines = 20;

    private sealed record CacheEntry(SpaceData Data, DateTimeOffset CheckedAt);

    private sealed class Slot
    {
        public readonly SemaphoreSlim Lock = new(1, 1);
        public volatile CacheEntry? Current;
    }

    private readonly ConcurrentDictionary<string, Slot> _slots = new(StringComparer.OrdinalIgnoreCase);

    public async Task<SpaceData> GetAsync(SpaceOptions space, CancellationToken cancellationToken)
    {
        var slot = _slots.GetOrAdd(space.Key, _ => new Slot());
        if (IsFresh(slot.Current) is { } fresh)
        {
            return fresh;
        }

        await slot.Lock.WaitAsync(cancellationToken);
        try
        {
            if (IsFresh(slot.Current) is { } refreshedMeanwhile)
            {
                return refreshedMeanwhile;
            }

            var previous = slot.Current?.Data;
            SpaceData data;
            try
            {
                var fileDate = GetLastWriteTimeUtc(space.CsvPath);
                data = previous is not null && previous.FileDateUtc == fileDate
                    ? previous with { Stale = false }
                    : await LoadAsync(space, fileDate, cancellationToken);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                if (previous is null)
                {
                    logger.LogError(ex, "Cannot load space {Space} from {Path}", space.Key, space.CsvPath);
                    throw new SpaceDataUnavailableException(space.Key, ex);
                }

                logger.LogWarning(ex, "Cannot refresh space {Space} from {Path}, serving last loaded data", space.Key, space.CsvPath);
                data = previous with { Stale = true };
            }

            slot.Current = new CacheEntry(data, timeProvider.GetUtcNow());
            return data;
        }
        finally
        {
            slot.Lock.Release();
        }
    }

    private SpaceData? IsFresh(CacheEntry? entry)
    {
        var interval = TimeSpan.FromMinutes(refreshOptions.CurrentValue.CheckIntervalMinutes);
        return entry is not null && timeProvider.GetUtcNow() - entry.CheckedAt < interval ? entry.Data : null;
    }

    private static DateTime GetLastWriteTimeUtc(string path)
    {
        // File.GetLastWriteTimeUtc does not throw for a missing file, it returns 1601-01-01.
        if (!File.Exists(path))
        {
            throw new FileNotFoundException("CSV file not found or share unreachable.", path);
        }

        return File.GetLastWriteTimeUtc(path);
    }

    private async Task<SpaceData> LoadAsync(SpaceOptions space, DateTime fileDate, CancellationToken cancellationToken)
    {
        string content;
        // ReadWrite sharing: the batch may be rewriting the file while we read it.
        await using (var stream = new FileStream(space.CsvPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete, 4096, useAsync: true))
        using (var reader = new StreamReader(stream, Encoding.GetEncoding(space.Encoding), detectEncodingFromByteOrderMarks: true))
        {
            content = await reader.ReadToEndAsync(cancellationToken);
        }

        var result = CsvSpaceParser.Parse(new StringReader(content), space.BasePath);

        logger.LogInformation("Space {Space} loaded from {Path}: {Count} lines, {Skipped} skipped",
            space.Key, space.CsvPath, result.Entries.Count, result.Skipped.Count);
        foreach (var line in result.Skipped.Take(MaxLoggedSkippedLines))
        {
            logger.LogWarning("Space {Space}, line {Line} skipped ({Reason}): {Content}", space.Key, line.LineNumber, line.Reason, line.Content);
        }

        return new SpaceData(result.Entries, fileDate, Stale: false);
    }
}
