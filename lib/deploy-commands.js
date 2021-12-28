const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { clientId, discordToken } = require('../private/config.json');

const commands = [
	new SlashCommandBuilder().setName('aquarium').setDescription('Check one of your aquariums.')
	.addIntegerOption(
		option => option.setName('location').setDescription('Check the aquarium of a specified location.').setRequired(false)
	)
	.addUserOption(
		option => option.setName('user').setDescription('Check aquarium of another player.').setRequired(false)
	),
	new SlashCommandBuilder().setName('aquariums').setDescription('Check all of your aquariums.')
	.addUserOption(
		option => option.setName('user').setDescription('Check all aquariums of another player.').setRequired(false)
	),
	new SlashCommandBuilder().setName('collect').setDescription('Collect coins from your aquariums.'),

	new SlashCommandBuilder().setName('fish').setDescription('Catch fish!').addStringOption(
		option => option.setName('bait').setDescription('Uses bait.').setRequired(false)
	),

	new SlashCommandBuilder().setName('equipment').setDescription('Check your equipment.').addUserOption(
		option => option.setName('user').setDescription('Check equipment of another player.').setRequired(false)
	),

	new SlashCommandBuilder().setName('quest').setDescription('Quests!')
	.addSubcommand(subcommand => subcommand.setName('check').setDescription('Check your current quest.').addUserOption(
		option => option.setName('user').setDescription('Check quest of another player.').setRequired(false)
	))
	.addSubcommand(subcommand => subcommand.setName('claim').setDescription('Claim quest rewards.'))
	.addSubcommand(subcommand => subcommand.setName('reset').setDescription('Reset your quest.')),

	new SlashCommandBuilder().setName('shop').setDescription('Shop.')
	.addSubcommand(subcommand => subcommand.setName('equipment').setDescription('View equipment upgrades.')),

	new SlashCommandBuilder().setName('stats').setDescription('Check stats.')
	.addSubcommand(subcommand => subcommand.setName('player').setDescription('Check player stats.').addUserOption(
		option => option.setName('user').setDescription('Check stats of another player.').setRequired(false)
	))
	.addSubcommand(subcommand => subcommand.setName('server').setDescription('Check server stats.'))
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(discordToken);

const guildId = "727626849148207195"; // DEV
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);