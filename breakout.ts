import _config from './config';
//declare function shuffle<T>(list: T[]): undefined;
import shuffle from 'shuffle-array';

import type { Guild, TextChannel, Client, Snowflake, PermissionOverwrites } from 'discord.js';

interface BreakoutConfig {
    guild_2025: Snowflake;
    breakout_unassigned_role: Snowflake;
    breakout_assigned_role: Snowflake;
    breakout_category: Snowflake;
    breakout_room_size: number;
}

const config = _config as BreakoutConfig;

const getRoom = (guild: Guild, number: number) => {
    const name = `room-${number}`;
    return guild.channels.cache.find(channel => channel.name == name) as TextChannel;
};

const createRoom = async (guild: Guild, number: number) => {
    const name = `room-${number}`;
    if (!getRoom(guild, number)) {
        const category = guild.channels.resolve(config.breakout_category)!;
        await guild.channels.create(name, {
            topic: `Small chat #${number}: hang out with 10 other people! :D`,
            parent: category,
        });
    }
};

const deleteRoom = async (guild: Guild, number: number) => {
    const room = getRoom(guild, number);
    if (room) {
        await room.delete();
    }
};

const numRooms = (guild: Guild) => {
    for (let i = 1; ; i++) {
        if (!getRoom(guild, i)) {
            return i - 1;
        }
    }
};

const topRoom = (guild: Guild) => {
    return getRoom(guild, numRooms(guild));
};

const pushRoom = (guild: Guild) => {
    return createRoom(guild, numRooms(guild) + 1);
};

// TODO: Bind this to a top-level command
const popRoom = (guild: Guild) => {
    deleteRoom(guild, numRooms(guild));
};

// TODO: Bind this to a top-level command
const unassignRoom = (room: TextChannel, user: Snowflake, guild: Guild) => {
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role)!;
    const role_assigned = guild.roles.resolve(config.breakout_assigned_role)!;
    room.createOverwrite(user, { 'VIEW_CHANNEL': false });
    const guildMember = guild.members.resolve(user)!;
    guildMember.roles.remove(role_assigned);
    guildMember.roles.add(role_unassigned);
};

const sizeOfRoom = (room: TextChannel) => {
    const inRoom = (overwrite: PermissionOverwrites) => overwrite.type === 'member' && overwrite.allow.has('VIEW_CHANNEL');
    return room.permissionOverwrites.filter(inRoom).size;
};

const isFull = (room: TextChannel) => {
    return sizeOfRoom(room) >= config.breakout_room_size;
};

export const assignToRoom = async (user: Snowflake, guild: Guild) => {
    if (numRooms(guild) === 0 || isFull(topRoom(guild))) {
        await pushRoom(guild);
    }
    if (!topRoom(guild)) {
        console.log('Aaaaah room is undefined');
        return;
    }
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role)!;
    const role_assigned = guild.roles.resolve(config.breakout_assigned_role)!;
    console.log(`Starting assigning ${user} to ${topRoom(guild).name}`);
    try {
        await topRoom(guild).createOverwrite(user, { 'VIEW_CHANNEL': true });
        const guildMember = guild.members.resolve(user)!;
        await guildMember.roles.remove(role_unassigned);
        await guildMember.roles.add(role_assigned);
        console.log(`Finished assigning ${user} to ${topRoom(guild).name}`);
    } catch (e) {
        console.log(`${e}`)
    }
};

export const fillBreakoutRooms = async (client: Client) => {
    const guild = client.guilds.cache.get(config.guild_2025)!;
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role)!;
    const unassignedPeople = role_unassigned.members.map(member => member.user.id);
    shuffle(unassignedPeople);
    for (const user of unassignedPeople) {
        await assignToRoom(user, guild);
    }
};
