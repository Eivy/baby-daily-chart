import React from 'react';
import { connect } from 'react-redux';
import { Actions, mapDispatchToProps, mapStateToProps } from './dispatcher';
import { State } from './states';
import Header from './Header';
import Login from './Login';
import Timeline from './Timeline';
import Config from './Config';

type Props = State & Actions;

const App: React.FC<Props> = React.memo((props) => {
  return (
    <div id='main' className="App mdl-layout mdl-js-layout mdl-layout--fixed-header">
        <Header />
        <main className="mdl-layout__content">
        {
          props.screen === 'root' ? <Timeline /> :
          props.screen === 'config' ? <Config /> : <Login />
        }
        </main>
    </div>
  );
});

export default connect(mapStateToProps, mapDispatchToProps)(App);
