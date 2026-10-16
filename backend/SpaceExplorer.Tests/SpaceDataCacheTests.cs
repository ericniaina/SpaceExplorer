using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using SpaceExplorer.Api.Configuration;
using SpaceExplorer.Api.Data;

namespace SpaceExplorer.Tests;

public sealed class SpaceDataCacheTests : IDisposable
{
    private sealed class ManualTimeProvider : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 15, 8, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class StaticOptionsMonitor<T>(T value) : IOptionsMonitor<T>
    {
        public T CurrentValue => value;
        public T Get(string? name) => value;
        public IDisposable? OnChange(Action<T, string?> listener) => null;
    }

    private readonly string _directory = Directory.CreateTempSubdirectory("space-explorer-tests").FullName;
    private readonly ManualTimeProvider _time = new();
    private readonly SpaceDataCache _cache;
    private readonly SpaceOptions _space;

    public SpaceDataCacheTests()
    {
        _space = new SpaceOptions { Key = "A", CsvPath = Path.Combine(_directory, "a.csv"), BasePath = @"D:\Base" };
        _cache = new SpaceDataCache(
            new StaticOptionsMonitor<DataRefreshOptions>(new DataRefreshOptions { CheckIntervalMinutes = 10 }),
            _time,
            NullLogger<SpaceDataCache>.Instance);
    }

    public void Dispose() => Directory.Delete(_directory, recursive: true);

    private void WriteCsv(long size, DateTime lastWriteUtc)
    {
        File.WriteAllText(_space.CsvPath, $@"D:\Base\C1\W1\jobs;{size}");
        File.SetLastWriteTimeUtc(_space.CsvPath, lastWriteUtc);
    }

    private async Task<long> CurrentSize() => (await _cache.GetAsync(_space, CancellationToken.None)).Entries.Single().Size;

    [Fact]
    public async Task Reloads_when_file_date_changes_after_check_interval()
    {
        WriteCsv(1, new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc));
        Assert.Equal(1, await CurrentSize());

        WriteCsv(2, new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc));
        _time.Now += TimeSpan.FromMinutes(5);
        Assert.Equal(1, await CurrentSize()); // not checked yet

        _time.Now += TimeSpan.FromMinutes(6);
        Assert.Equal(2, await CurrentSize());
    }

    [Fact]
    public async Task Keeps_cached_content_when_file_date_is_unchanged()
    {
        var date = new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc);
        WriteCsv(1, date);
        await CurrentSize();

        WriteCsv(2, date);
        _time.Now += TimeSpan.FromMinutes(11);
        Assert.Equal(1, await CurrentSize());
    }

    [Fact]
    public async Task Serves_last_content_as_stale_when_file_disappears()
    {
        WriteCsv(1, new DateTime(2026, 10, 14, 0, 0, 0, DateTimeKind.Utc));
        await CurrentSize();

        File.Delete(_space.CsvPath);
        _time.Now += TimeSpan.FromMinutes(11);
        var data = await _cache.GetAsync(_space, CancellationToken.None);

        Assert.True(data.Stale);
        Assert.Equal(1, data.Entries.Single().Size);
    }

    [Fact]
    public async Task Throws_unavailable_when_never_loaded()
    {
        await Assert.ThrowsAsync<SpaceDataUnavailableException>(() => _cache.GetAsync(_space, CancellationToken.None));
    }
}
