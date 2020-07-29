import React from 'react';
import { connect } from 'react-redux';
import * as fire from 'firebase';
import * as fireui from 'firebaseui-ja';
import { State } from './states';
import { Actions, mapDispatchToProps, mapStateToProps } from './dispatcher';

declare var firebase: typeof fire;
declare var firebaseui: typeof fireui;

type Props = State & Actions;

class Login extends React.Component<Props> {
  ui: any;

  constructor(props: Props) {
    super(props);
    this.ui = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebase.auth());
  }

  componentDidMount() {
    this.ui.start('#firebase-auth-container', {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
      ],
      tosUrl: document.location.href,
    });
    firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
      if (user) {
        const url = new URL(window.location.toString());
        const id = url.searchParams.get("id");
        if (id) {
          this.props.updateUser(id);
        } else {
          this.props.updateUser(user.uid);
        }
        this.props.updateScreen('root');
      } else {
        this.props.updateUser('');
        this.props.updateScreen('login');
      }
    });
  }

  render() {
    return (
      <div id='firebase-auth-container'></div>
    );
  }

}

export default connect(mapStateToProps, mapDispatchToProps)(Login);
