import { reducerWithInitialState } from 'typescript-fsa-reducers';
import { actions } from './actions';

export interface State {
  user: string;
  screen: string;
}

const initialState: State = {
  user: '',
  screen: '',
}

export const reducer = reducerWithInitialState(initialState)
  .case(actions.updateUser, (state, user) => {
    return Object.assign({}, state, { user });
  })
  .case(actions.updateScreen, (state, screen) => {
    return Object.assign({}, state, { screen });
  })
  ;
