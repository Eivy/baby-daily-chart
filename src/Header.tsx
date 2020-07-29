import React from 'react';
import { connect } from 'react-redux';

import { State } from './states';
import { Actions, mapDispatchToProps, mapStateToProps } from './dispatcher';
import { IconButton } from '@material-ui/core';
import { Settings, DirectionsRun } from '@material-ui/icons';
import { AppBar, Typography, Toolbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import * as fire from 'firebase';

declare var firebase: typeof fire;

type Props = State & Actions;

const useStyles = makeStyles((theme) => ({
  glow: { flexGrow: 1 },
}));

const Header: React.FC<Props> = React.memo((props) => {
  const classes = useStyles();
  const goToConfig = () => {
    props.updateScreen('config');
  };

  const logout = () => {
    firebase.auth().signOut();
  };

  const goToRoot = () => {
    props.updateScreen('root');
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography  variant="h6" onClick={goToRoot}>BabyDailyChart</Typography>
        <div className={classes.glow} />
        <IconButton edge="end" onClick={goToConfig}><Settings /></IconButton>
        <IconButton edge="end" onClick={logout}><DirectionsRun /></IconButton>
      </Toolbar>
    </AppBar>
  );
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);
