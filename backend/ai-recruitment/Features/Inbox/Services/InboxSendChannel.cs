using System.Threading.Channels;

namespace ai_recruitment.Features.Inbox.Services
{
    // In-memory nudge from "EmailMessage row written with Status=Sending" to "dispatcher, go
    // send it now" - see CandidateStatusOutboxChannel, which this mirrors exactly. Durability
    // comes from InboxSendDispatcher's periodic sweep, not from this signal.
    public class InboxSendChannel
    {
        private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        public ChannelReader<Guid> Reader => _channel.Reader;

        public void SignalPending(Guid messageId) => _channel.Writer.TryWrite(messageId);
    }
}
