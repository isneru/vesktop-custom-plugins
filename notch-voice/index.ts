import definePlugin, { PluginNative } from "@utils/types";
import { SelectedChannelStore, UserStore } from "@webpack/common";

const Native = VencordNative.pluginHelpers.NotchVoice as PluginNative<typeof import("./native")>;

let speaking = false;

function publish() {
    const call = SelectedChannelStore.getVoiceChannelId() != null;
    Native.publish({ call, speaking: call && speaking });
}

export default definePlugin({
    name: "NotchVoice",
    description: "Publish voice call and speaking state for the notch shell's bare mode bar",
    authors: [{ name: "isneru", id: 0n }],

    flux: {
        // The voice engine reports the local user too, which is what draws your
        // own speaking ring. Flag 1 is the microphone; 2 is soundshare.
        SPEAKING({ userId, speakingFlags }: { userId: string; speakingFlags: number; }) {
            if (userId !== UserStore.getCurrentUser()?.id) return;
            const next = (speakingFlags & 1) !== 0;
            if (next === speaking) return;
            speaking = next;
            publish();
        },
        VOICE_CHANNEL_SELECT: publish,
        RTC_CONNECTION_STATE: publish,
    },

    start: publish,

    stop() {
        speaking = false;
        Native.clear();
    },
});
