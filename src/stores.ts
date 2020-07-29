import { createStore, combineReducers } from 'redux';
import { reducer, State } from './states';

export type AppState = {
  baby: State,
};

const store = createStore(
  combineReducers<AppState>({
    baby: reducer,
  })
);

export default store;
