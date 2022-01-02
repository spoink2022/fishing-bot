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

	new SlashCommandBuilder().setName('bounty').setDescription('Check the weekly bounty.'),

	new SlashCommandBuilder().setName('buy').setDescription('Buy from the shop!')
	.addSubcommand(subcommand => subcommand.setName('aquarium').setDescription('Upgrade your aquarium.'))
	.addSubcommand(subcommand => subcommand.setName('rod').setDescription('Upgrade your fishing rod.'))
	.addSubcommand(subcommand => subcommand.setName('line').setDescription('Upgrade your fishing line.'))
	.addSubcommand(subcommand => subcommand.setName('hook').setDescription('Upgrade your hook.'))
	.addSubcommand(subcommand => subcommand.setName('gloves').setDescription('Upgrade your gloves.'))
	.addSubcommand(subcommand => subcommand.setName('swivel').setDescription('Upgrade your swivel.')),

	new SlashCommandBuilder().setName('card').setDescription('Check one of your cards.')
	.addIntegerOption(
		option => option.setName('id').setDescription('The ID of the card to check.').setRequired(true)
	)
	.addUserOption(
		option => option.setName('user').setDescription('Check card of another player.').setRequired(false)
	),
	new SlashCommandBuilder().setName('cards').setDescription('Check all of your cards.').addUserOption(
		option => option.setName('user').setDescription('Check all cards of another player.').setRequired(false)
	),

	new SlashCommandBuilder().setName('clan').setDescription('Clan Commands!')
	.addSubcommand(subcommand => subcommand.setName('profile').setDescription('Check clan profiles.').addUserOption(
		option => option.setName('user').setDescription('View the clan of another player.').setRequired(false)
	))
	.addSubcommand(subcommand => subcommand.setName('members').setDescription('View a member list of your clan.'))
	.addSubcommand(subcommand => subcommand.setName('create').setDescription('Create a clan.').addStringOption(
		option => option.setName('name').setDescription('Your clan name.').setRequired(true)
	))
	.addSubcommand(subcommand => subcommand.setName('rename').setDescription('Rename your clan.').addStringOption(
		option => option.setName('name').setDescription('Your new clan name.').setRequired(true)
	))
	.addSubcommand(subcommand => subcommand.setName('promote').setDescription('Promote a clan member.').addIntegerOption(
		option => option.setName('member').setDescription('The target member id.').setRequired(true)
	))
	.addSubcommand(subcommand => subcommand.setName('demote').setDescription('Demote a clan member.').addIntegerOption(
		option => option.setName('member').setDescription('The target member id.').setRequired(true)
	))
	.addSubcommand(subcommand => subcommand.setName('kick').setDescription('Kick a clan member.').addIntegerOption(
		option => option.setName('member').setDescription('The target member id.').setRequired(true)
	))
	.addSubcommand(subcommand => subcommand.setName('join').setDescription('Join a clan.')
	.addIntegerOption( option => option.setName('id').setDescription('The global clan id.').setRequired(true))
	.addStringOption( option => option.setName('password').setDescription('The clan password.').setRequired(false))
	)
	.addSubcommand(subcommand => subcommand.setName('leave').setDescription('Leave a clan.'))
	.addSubcommandGroup(subcommandgroup => subcommandgroup.setName('password').setDescription('Clan password functionality.')
		.addSubcommand(subcommand => subcommand.setName('check').setDescription('Check your clan password (private).'))
		.addSubcommand(subcommand => subcommand.setName('generate').setDescription('Generate a new clan password.'))
		.addSubcommand(subcommand => subcommand.setName('disable').setDescription('Disable clan password.'))
	)
	.addSubcommand(subcommand => subcommand.setName('campaign').setDescription('Check clan campaign status.'))
	.addSubcommand(subcommand => subcommand.setName('shop').setDescription('Shop for clan perks!'))
	.addSubcommand(subcommand => subcommand.setName('perks').setDescription('Check clan perks.'))
	.addSubcommandGroup(subcommandgroup => subcommandgroup.setName('buy').setDescription('Buy from the clan shop!')
		.addSubcommand(subcommand => subcommand.setName('cooldown').setDescription('Decrease fishing cooldown.'))
		.addSubcommand(subcommand => subcommand.setName('coin').setDescription('Increase fishing coin bonus.'))
		.addSubcommand(subcommand => subcommand.setName('exp').setDescription('Increase fishing exp bonus.'))
		.addSubcommand(subcommand => subcommand.setName('vote').setDescription('Increase vote rewards.'))
		.addSubcommand(subcommand => subcommand.setName('campaign').setDescription('Increase campaign rewards.'))
		.addSubcommand(subcommand => subcommand.setName('quest').setDescription('Increase quest rewards.'))
		.addSubcommand(subcommand => subcommand.setName('rename').setDescription('Purchase a clan rename.'))
	),

	new SlashCommandBuilder().setName('fish').setDescription('Catch fish!').addStringOption(
		option => option.setName('bait').setDescription('Uses bait.').setRequired(false)
	),

	new SlashCommandBuilder().setName('give').setDescription('Give something to another player.')
	.addSubcommand(subcommand => subcommand.setName('card').setDescription('Give a card.')
		.addIntegerOption(
			option => option.setName('id').setDescription('The ID of the card to give.').setRequired(true)
		).addUserOption(
			option => option.setName('user').setDescription('The user to give to.').setRequired(true)
		)
	)
	.addSubcommand(subcommand => subcommand.setName('ring').setDescription('Give a ring.')
		.addIntegerOption(
			option => option.setName('id').setDescription('The ID of the ring to give.').setRequired(true)
		).addUserOption(
			option => option.setName('user').setDescription('The user to give to.').setRequired(true)
		)
	),

	new SlashCommandBuilder().setName('vote').setDescription('Vote for Big Tuna!'),

	new SlashCommandBuilder().setName('leaderboards').setDescription('View leaderboards within a server.')
	.addSubcommand(subcommand => subcommand.setName('kg').setDescription('Server leaderboards by weight caught.'))
	.addSubcommand(subcommand => subcommand.setName('score').setDescription('Server leaderboards by fisher score.')),

	new SlashCommandBuilder().setName('location').setDescription('View info about a location.').addIntegerOption(
		option => option.setName('id').setDescription('The location id.').setRequired(true)
	),
	new SlashCommandBuilder().setName('locations').setDescription('View all locations and their weather.'),
	new SlashCommandBuilder().setName('weather').setDescription('View all locations and their weather.'),

	new SlashCommandBuilder().setName('equipment').setDescription('Check your equipment.').addUserOption(
		option => option.setName('user').setDescription('Check equipment of another player.').setRequired(false)
	),

	new SlashCommandBuilder().setName('quest').setDescription('Check your current quest.').addUserOption(
		option => option.setName('user').setDescription('Check quest of another player.').setRequired(false)
	),

	new SlashCommandBuilder().setName('ring').setDescription('Check one of your rings.')
	.addIntegerOption(
		option => option.setName('id').setDescription('The ID of the ring to check.').setRequired(true)
	)
	.addUserOption(
		option => option.setName('user').setDescription('Check ring of another player.').setRequired(false)
	),
	new SlashCommandBuilder().setName('rings').setDescription('Check all of your rings.').addUserOption(
		option => option.setName('user').setDescription('Check all rings of another player.').setRequired(false)
	),

	new SlashCommandBuilder().setName('shop').setDescription('Shop.')
	.addSubcommand(subcommand => subcommand.setName('bait').setDescription('Shop for bait.'))
	.addSubcommand(subcommand => subcommand.setName('equipment').setDescription('View equipment upgrades.'))
	.addSubcommand(subcommand => subcommand.setName('rings').setDescription('Shop for ring packs.')),

	new SlashCommandBuilder().setName('stats').setDescription('Check stats.')
	.addSubcommand(subcommand => subcommand.setName('player').setDescription('Check player stats.').addUserOption(
		option => option.setName('user').setDescription('Check stats of another player.').setRequired(false)
	))
	.addSubcommand(subcommand => subcommand.setName('server').setDescription('Check server stats.'))
	.addSubcommand(subcommand => subcommand.setName('global').setDescription('Check global stats.'))
].map(command => command.toJSON());

const rest = new REST({ version: '9' }).setToken(discordToken);

const guildId = "727626849148207195"; // DEV
rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
	.then(() => console.log('Successfully registered application commands for personal.'))
	.catch(console.error);

const guildId2 = "809843596026707981"; // CS Gr. 11
rest.put(Routes.applicationGuildCommands(clientId, guildId2), { body: commands })
	.then(() => console.log('Successfully registered application commands for CS Gr. 11.'))
	.catch(console.error);