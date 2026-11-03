using System.Threading.Channels;

namespace ai_recruitment.Features.Inbox.Services
{
    // In-memory nudge from "inbound EmailMessage saved" to "dispatcher, notify n8n now" -
    // mirrors InboxSendChannel exactly. Durability comes from InboxReceiveNotifyDispatcher's
    // periodic sweep, not from this signal.
    public class InboxReceiveNotifyChannel
    {
        private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        public ChannelReader<Guid> Reader => _channel.Reader;

        public void SignalPending(Guid messageId) => _channel.Writer.TryWrite(messageId);
    }
}
