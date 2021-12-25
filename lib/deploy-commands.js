const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, discordToken } = require('../private/config.json');

const commands = [
	new SlashCommandBuilder().setName('fish').setDescription('Catch fish!').addStringOption(
		option => option.setName('bait').setDescription('Uses bait.').setRequired(false)
	),

	new SlashCommandBuilder().setName('equipment').setDescription('Check your equipment.').addUserOption(
		option => option.setName('user').setDescription('Check equipment of another player.').setRequired(false)
	),

	new SlashCommandBuilder().setName('stats').setDescription('Check your stats.').addUserOption(
		option => option.setName('user').setDescription('Check stats of another player.').setRequired(false)
	),
	new SlashCommandBuilder().setName('serverstats').setDescription('Check server stats.')
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(discordToken);

const guildId = "727626849148207195"; // DEV
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);