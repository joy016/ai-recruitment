using System.Collections.Concurrent;
using System.Text.Json;
using System.Threading.Channels;

namespace ai_recruitment.Features.Inbox.Services
{
    // Singleton in-memory pub/sub for GET /api/inbox/events (SSE). Deliberately not backed by
    // anything durable - a missed event just means the client's next poll/refresh picks up the
    // current state; this channel only exists to make that refresh near-instant.
    public class InboxEventBroadcaster : IInboxEventBroadcaster
    {
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly ConcurrentDictionary<Guid, Channel<string>> _subscribers = new();
        private readonly ILogger<InboxEventBroadcaster> _logger;

        public InboxEventBroadcaster(ILogger<InboxEventBroadcaster> logger)
        {
            _logger = logger;
        }

        public (ChannelReader<string> Reader, IDisposable Subscription) Subscribe()
        {
            var id = Guid.NewGuid();
            var channel = Channel.CreateBounded<string>(new BoundedChannelOptions(100)
            {
                FullMode = BoundedChannelFullMode.DropOldest,
                SingleReader = true,
                SingleWriter = false,
            });

            _subscribers[id] = channel;
            return (channel.Reader, new Unsubscriber(_subscribers, id));
        }

        public void Publish(string eventName, object payload)
        {
            if (_subscribers.IsEmpty)
            {
                return;
            }

            string formatted;
            try
            {
                var json = JsonSerializer.Serialize(payload, JsonOptions);
                formatted = $"event: {eventName}\ndata: {json}\n\n";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to serialize Inbox SSE event {EventName}.", eventName);
                return;
            }

            foreach (var channel in _subscribers.Values)
            {
                channel.Writer.TryWrite(formatted);
            }
        }

        private sealed class Unsubscriber : IDisposable
        {
            private readonly ConcurrentDictionary<Guid, Channel<string>> _subscribers;
            private readonly Guid _id;

            public Unsubscriber(ConcurrentDictionary<Guid, Channel<string>> subscribers, Guid id)
            {
                _subscribers = subscribers;
                _id = id;
            }

            public void Dispose()
            {
                if (_subscribers.TryRemove(_id, out var channel))
                {
                    channel.Writer.TryComplete();
                }
            }
        }
    }
}
