using System.Threading.Channels;

namespace ai_recruitment.Features.Inbox.Services
{
    public interface IInboxEventBroadcaster
    {
        // Registers a new SSE connection and returns its reader plus a disposable that
        // unregisters it when the connection ends (controller action exits).
        (ChannelReader<string> Reader, IDisposable Subscription) Subscribe();

        // Fans an event out to every connected client. The Inbox is one shared mailbox
        // (not per-user), so - unlike /api/notifications - there is no recipient filtering.
        void Publish(string eventName, object payload);
    }
}
