const Discord = require('discord.js');
const config = require('./config');
const shuffle = require('shuffle-array');

const getRoom = (guild, number) => {
    const name = `room-${number}`;
    return guild.channels.cache.find(channel => channel.name == name);
};

const createRoom = async (guild, number) => {
    const name = `room-${number}`;
    if (getRoom(guild, number) === undefined) {
        const category = guild.channels.resolve(config.breakout_category);
        await guild.channels.create(name, {
            topic: `Small chat #${number}: hang out with 10 other people! :D`,
            parent: category,
        });
    }
};

const deleteRoom = async (guild, number) => {
    const room = getRoom(guild, number);
    if (room !== undefined) {
        await room.delete();
    }
};

const numRooms = (guild) => {
    for (let i = 1; ; i++) {
        if (getRoom(guild, i) === undefined) {
            return i - 1;
        }
    }
};

const topRoom = (guild) => {
    return getRoom(guild, numRooms(guild));
};

const pushRoom = async (guild) => {
    await createRoom(guild, numRooms(guild) + 1);
};

const popRoom = (guild) => {
    deleteRoom(guild, numRooms(guild));
};

const unassignRoom = (room, user, guild) => {
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role);
    const role_assigned = guild.roles.resolve(config.breakout_assigned_role);
    room.createOverwrite(user, { 'VIEW_CHANNEL': false });
    const guildMember = guild.members.resolve(user);
    guildMember.roles.remove(role_assigned);
    guildMember.roles.add(role_unassigned);
};

const sizeOfRoom = (room) => {
    const inRoom = overwrite => overwrite.type === 'member' && overwrite.allow.has('VIEW_CHANNEL');
    return room.permissionOverwrites.filter(inRoom).size;
};

const isFull = (room) => {
    return sizeOfRoom(room) >= config.breakout_room_size;
};

const assignToRoom = async (user, guild) => {
    if (numRooms(guild) === 0 || isFull(topRoom(guild))) {
        await pushRoom(guild);
    }
    if (topRoom(guild) === undefined) {
        console.log('Aaaaah room is undefined');
        return;
    }
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role);
    const role_assigned = guild.roles.resolve(config.breakout_assigned_role);
    console.log(`Starting assigning ${user} to ${topRoom(guild).name}`);
    try {
        await topRoom(guild).createOverwrite(user, { 'VIEW_CHANNEL': true });
        const guildMember = guild.members.resolve(user);
        await guildMember.roles.remove(role_unassigned);
        await guildMember.roles.add(role_assigned);
        console.log(`Finished assigning ${user} to ${topRoom(guild).name}`);
    } catch (e) {
        console.log(`${e}`)
    }
};

/**
 * Fills breakout rooms
 * @param {Discord.Client} client
 */
const fillBreakoutRooms = async (client) => {
    const guild = client.guilds.cache.get(config.guild_2025);
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role);
    const unassignedPeople = role_unassigned.members.map(member => member.user.id);
    shuffle(unassignedPeople);
    for (const user of unassignedPeople) {
        await assignToRoom(user, guild);
    }
};

module.exports = {
    assignToRoom: assignToRoom,
    fillBreakoutRooms: fillBreakoutRooms,
};