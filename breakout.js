const Discord = require('discord.js');
const config = require('./config');
const shuffle = require('shuffle-array');

const getRoom = (guild, number) => {
    const name = `room-${number}`;
    return guild.channels.cache.find(channel => channel.name == name);
};

const createRoom = (guild, number) => {
    const name = `room-${number}`;
    if (getRoom(guild, number) === undefined) {
        const category = guild.channels.resolve(config.breakout_category);
        guild.channels.create(name, {
            topic: `Small chat #${number}: hang out with 10 other people! :D`,
            parent: category,
        });
    }
};

const deleteRoom = (guild, number) => {
    const room = getRoom(guild, number);
    if (room !== undefined) {
        room.delete();
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

const pushRoom = (guild) => {
    createRoom(guild, numRooms(guild) + 1);
};

const popRoom = (guild) => {
    deleteRoom(guild, numRooms(guild));
};

const assignRoom = async (room, user, guild) => {
    if (room === undefined) {
        console.log('Aaaaah room is undefined');
        return;
    }
    console.log(`Starting assigning ${user} to ${room.name}`);
    const role_unassigned = guild.roles.resolve(config.breakout_unassigned_role);
    const role_assigned = guild.roles.resolve(config.breakout_assigned_role);
    try {
        await room.createOverwrite(user, { 'VIEW_CHANNEL': true });
        const guildMember = guild.members.resolve(user);
        guildMember.roles.remove(role_unassigned);
        guildMember.roles.add(role_assigned);
        console.log(`Finished assigning ${user} to ${room.name}`);
    } catch (e) {
        console.log(`${e}`)
    }
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

const assignToRoom = (user, guild) => {
    if (numRooms(guild) === 0 || isFull(topRoom(guild))) {
        pushRoom(guild);
    }
    assignRoom(topRoom(guild), user, guild);
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
    for (const user in unassignedPeople) {
        await assignToRoom(user, guild);
    }
};

module.exports = {
    assignToRoom: assignToRoom,
    fillBreakoutRooms: fillBreakoutRooms,
};