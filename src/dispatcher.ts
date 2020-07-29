import { Dispatch } from 'redux';
import { Action } from 'typescript-fsa';
import { AppState } from './stores';
import { actions } from './actions';

export interface Actions {
  updateUser: (v: string) => Action<string>;
  updateScreen: (v: string) => Action<string>;
}

export function mapDispatchToProps(dispatch: Dispatch<Action<any>>) {
  return {
    updateUser: (v: string) => dispatch(actions.updateUser(v)),
    updateScreen: (v: string) => dispatch(actions.updateScreen(v)),
  }
}

export function mapStateToProps(appState: AppState) {
  return Object.assign({}, appState.baby);
}
