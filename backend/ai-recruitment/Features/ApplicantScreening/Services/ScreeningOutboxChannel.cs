using System.Threading.Channels;

namespace ai_recruitment.Features.ApplicantScreening.Services
{
    // In-memory nudge from "outbox row written" to "dispatcher, go send it now", so
    // delivery normally happens within milliseconds of submission instead of waiting for
    // the next periodic sweep. Purely a latency optimization: ScreeningOutboxDispatcher's
    // sweep is what actually guarantees durability (a dropped signal, e.g. across an app
    // restart, just means the row is picked up on the next sweep instead).
    public class ScreeningOutboxChannel
    {
        private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>(
            new UnboundedChannelOptions { SingleReader = true, SingleWriter = false });

        public ChannelReader<Guid> Reader => _channel.Reader;

        public void SignalPending(Guid outboxId) => _channel.Writer.TryWrite(outboxId);
    }
}
