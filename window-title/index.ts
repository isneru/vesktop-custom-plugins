import definePlugin from "@utils/types";
import { ChannelStore, GuildStore, RelationshipStore, SelectedChannelStore, SelectedGuildStore, UserStore } from "@webpack/common";

const title = Object.getOwnPropertyDescriptor(Document.prototype, "title")!;

// What Discord last assigned. The getter hands this back so Discord's own
// "document.title !== next" checks keep comparing against its own value.
let discordTitle = "";

function friendName(id: string) {
    const user = UserStore.getUser(id);
    return RelationshipStore.getNickname(id) || user?.globalName || user?.username;
}

function rewrite() {
    const guildId = SelectedGuildStore.getGuildId();
    if (guildId) return GuildStore.getGuild(guildId)?.name;

    const channelId = SelectedChannelStore.getChannelId();
    const channel = channelId ? ChannelStore.getChannel(channelId) : undefined;
    if (channel?.isDM()) return friendName(channel.getRecipientId()!);
    if (channel?.isGroupDM()) return channel.name || channel.recipients.map(friendName).join(", ");
}

function apply() {
    title.set!.call(document, rewrite() || discordTitle);
}

export default definePlugin({
    name: "WindowTitle",
    description: "Set the window title to the current server's name, or the friend's name in a DM",
    authors: [{ name: "isneru", id: 0n }],

    start() {
        discordTitle = title.get!.call(document);
        // Discord sets the title with plain assignments (react-helmet and its
        // notification flash), so an own-property accessor sees every one.
        Object.defineProperty(document, "title", {
            configurable: true,
            get: () => discordTitle,
            set(value: string) {
                discordTitle = value;
                apply();
            },
        });
        apply();
    },

    stop() {
        delete (document as { title?: string; }).title;
        document.title = discordTitle;
    },
});
