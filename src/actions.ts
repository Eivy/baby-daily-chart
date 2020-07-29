import actionCreateFactory from 'typescript-fsa';

const creator = actionCreateFactory();

export const actions = {
  updateUser: creator<string>('ACTIONS_UPDATE_USER'),
  updateScreen: creator<string>('ACTIONS_UPDATE_SCREEN'),
};
