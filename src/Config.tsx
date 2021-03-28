/// <reference path="./schema.d.ts" />
import * as React from 'react';
import { connect } from 'react-redux';
import path from 'path';
import { State } from './states';
import { Actions, mapDispatchToProps, mapStateToProps } from './dispatcher';
import { Button, IconButton, Checkbox, TextField, Chip, Tooltip, Dialog, DialogActions, DialogTitle, DialogContent, FormControl, FormControlLabel, NativeSelect, InputLabel, Typography } from '@material-ui/core';
import { Add, Delete, Settings } from '@material-ui/icons';
import * as fire from 'firebase';

declare var firebase: typeof fire;

type Props = State & Actions;

interface LocalState {
  babies: Baby[];
  buttons: Button[];
  newBabyName: string;
  addNewCoop: string;
  targetBaby: Baby | undefined;
  targetButton: Button | undefined;
  open: boolean;
  uids: string[];
  physbtn: any;
}

class Config extends React.Component<Props, LocalState> {

  babySub: any; // () => void
  buttonSub: any; // () => void
  permittedSub: any; // () => void
  physbtnSub: any;

  constructor(props: Props) {
    super(props);

    this.changedBabyName = this.changedBabyName.bind(this);
    this.addBaby = this.addBaby.bind(this);
    this.addButton = this.addButton.bind(this);
    this.updateButton = this.updateButton.bind(this);
    this.changeNewCoop = this.changeNewCoop.bind(this);

    this.state = {
      babies: [],
      buttons: [],
      newBabyName: '',
      addNewCoop: '',
      targetBaby: undefined,
      targetButton: undefined,
      uids: [],
      open: false,
      physbtn: {},
    };
  }

  componentDidMount() {
    const firestore = firebase.firestore();
    const doc = firestore.doc(path.join('Users', this.props.user));
    this.babySub = doc.collection('baby').onSnapshot((snapshot) => {
      let babies: Baby[] = [];
      snapshot.forEach((v) => {
        babies.push(Object.assign(v.data(), { ID: v.id }) as Baby);
      });
      this.setState({ babies: babies });
    });
    this.buttonSub = doc.collection('button').onSnapshot((snapshot) => {
      let buttons: Button[] = [];
      snapshot.forEach((v) => {
        buttons.push(Object.assign(v.data(), { ID: v.id }) as Button);
      });
      this.setState({ buttons });
    });
    let config = doc.collection('config');
    this.permittedSub = config.doc('permitted').onSnapshot((snapshot) => {
      let permitted: string[] = [];
      permitted = snapshot.data()!.users as string[];
      this.setState({ uids: permitted })
    });
    this.physbtnSub = config.doc('PhysBtn').onSnapshot((snapshot) => {
      this.setState({ physbtn: snapshot.data() })
    });
  }

  componentWillUnmount() {
    if (this.babySub) this.babySub();
    if (this.buttonSub) this.buttonSub();
    if (this.permittedSub) this.permittedSub();
    if (this.physbtnSub) this.physbtnSub();
  }

  changedBabyName(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ newBabyName: event.target.value });
  }

  changeNewCoop(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({ addNewCoop: event.target.value });
  }

  addBaby(event: React.MouseEvent<HTMLElement>) {
    if (this.state.newBabyName === "") return;
    firebase.firestore().collection(path.join('Users', this.props.user, 'baby')).add({ Name: this.state.newBabyName } as Baby)
      .then(() => this.setState({ newBabyName: '' }));
  }

  addButton(baby?: string) {
    if (baby) {
      this.setState({ targetButton: { For: baby } as Button });
    } else {
      this.setState({ targetButton: {} as Button });
    }
    this.setState({ open: true });
  }

  updateButton() {
    if (this.state.targetButton?.ID) {
      firebase.firestore().doc(path.join('Users', this.props.user, 'button', this.state.targetButton.ID)).set(this.state.targetButton);
    } else {
      firebase.firestore().collection(path.join('Users', this.props.user, 'button')).add(this.state.targetButton!);
    }
    this.setState({ open: false });
  }

  removeBaby(baby: Baby) {
    if (window.confirm('本当に削除しますか?')) {
      firebase.firestore().doc(path.join('Users', this.props.user, 'baby', baby.ID)).delete();
      firebase.firestore().collection(path.join('Users', this.props.user, 'button')).where('For', '==', baby.ID).get()
        .then((snap) => {
          snap.forEach((v) => {
            firebase.firestore().doc(path.join('Users', this.props.user, 'button', v.id)).delete();
          });
        });
    }
  }

  removeButton() {
    if (window.confirm('本当に削除しますか?')) {
      const button = Object.assign(this.state.targetButton, {});
      firebase.firestore().doc(path.join('Users', this.props.user, 'button', button.ID)).delete();
      this.setState({ open: false });
    }
  }

  updateName(name: string) {
    this.state.targetButton!.Name = name;
    this.setState({ targetButton: this.state.targetButton });
  }

  updateDuration(flg: boolean) {
    this.state.targetButton!.IsDuration = flg;
    this.setState({ targetButton: this.state.targetButton });
  }

  updateMemo(flg: boolean) {
    this.state.targetButton!.UseMemo = flg;
    this.setState({ targetButton: this.state.targetButton });
  }

  async permitUser() {
    const uids = Array.from(this.state.uids);
    uids.push(this.state.addNewCoop);
    await firebase.firestore().collection(path.join('Users', this.props.user, 'config')).doc('permitted').set({ users: uids });
    this.setState({ addNewCoop: '' });
  }

  async removePermitted(uid: string) {
    const uids = Array.from(this.state.uids);
    uids.splice(uids.indexOf(uid), 1);
    await firebase.firestore().collection(path.join('Users', this.props.user, 'config')).doc('permitted').set({ users: uids });
  }

  async updatePhysbtn(k: number, id: string) {
    const v = Object.assign({}, this.state.physbtn);
    v["b" + k] = id;
    firebase.firestore().doc(path.join('Users', this.props.user, 'config', 'PhysBtn')).set(v)
  }

  async updatePhysbtnBaby(k: number, id: string) {
    const v = Object.assign({}, this.state.physbtn);
    v["a" + k] = id;
    firebase.firestore().doc(path.join('Users', this.props.user, 'config', 'PhysBtn')).set(v)
  }

  openDialog(b: Button, baby: Baby | undefined) {
    this.setState({ targetButton: b });
    this.setState({ targetBaby: baby });
    this.setState({ open: true });
  }

  render() {
    const babies = this.state.babies.map((b) => {
      const buttons = this.state.buttons.filter(v => v.For === b.ID).map((v) => {
        return (
          <Chip key={b.ID + v.Name} variant="outlined" label={v.Name} onClick={() => this.openDialog(v, b)} icon={<Settings />} />
        );
      })
      return (
        <div key={b.ID}>
          <div>
            {b.Name}
            <Tooltip title={`${b.Name}を削除`}>
              <IconButton onClick={(event) => this.removeBaby(b)}><Delete /></IconButton>
            </Tooltip>
            <Button onClick={(event) => this.addButton(b.ID)} color="primary" variant="contained">{`${b.Name}専用のボタンを追加`}</Button>
            {buttons}
          </div>
        </div>
      );
    })
    return (
      <div>
        <h2>共有</h2>
        <div>
          <div><span>あなたのID:</span> <span>{this.props.user}</span></div>
          <div><span>あなたのページへのリンクは</span> <a href={"/?id=" + this.props.user}>こちら</a></div>
          <TextField id="new_coop" value={this.state.addNewCoop} onChange={this.changeNewCoop} label="共有する人のID" />
          <IconButton onClick={(event) => this.permitUser()}><Add /></IconButton>
          {
            this.state.uids.map((v) => {
              return (
                <div key={v} >
                  <span>{v}</span>
                  <IconButton onClick={(event) => this.removePermitted(v)}><Delete /></IconButton>
                </div>
              );
            })
          }
        </div>
        <h2>赤ちゃん</h2>
        <div>
          <TextField id="new_baby" value={this.state.newBabyName} onChange={this.changedBabyName} label="赤ちゃんの名前" />
          <IconButton onClick={this.addBaby}><Add /></IconButton>
          {babies}
          <Button onClick={() => this.addButton()} color="primary" variant="contained">全員にボタンを追加</Button>
          {
            this.state.buttons.filter((v) => v.For === undefined || v.For === '').map((v) => {
              return (<Chip key={v.ID} variant="outlined" label={v.Name} onClick={() => this.openDialog(v, undefined)} icon={<Settings />} />);
            })
          }
        </div>
        <h2>物理ボタン</h2>
        <div>
          {
            [1, 2, 3].map((v) => {
              return (
                <div style={{ margin: "2em 0 2em 0" }}>
                  {v}番
                  <FormControl>
                    <InputLabel>赤ちゃん</InputLabel>
                    <NativeSelect
                      value={this.state.physbtn["a" + v]}
                      onChange={(e) => { this.updatePhysbtnBaby(v, e.target.value as string) }}
                    >
                      <option aria-label="未設定" />
                      {
                        this.state.babies.map((v) => {
                          return (<option value={v.ID}>{v.Name}</option>);
                        })
                      }
                    </NativeSelect>
                  </FormControl>
                  <FormControl>
                    <InputLabel>ボタン</InputLabel>
                    <NativeSelect
                      value={this.state.physbtn["b" + v]}
                      onChange={(e) => { this.updatePhysbtn(v, e.target.value as string) }}
                    >
                      <option aria-label="未設定" />
                      {
                        this.state.buttons.filter((b) => b.For === undefined || b.For === this.state.physbtn["a" + v]).map((v) => {
                          return (<option value={v.ID}>{v.Name}</option>);
                        })
                      }
                    </NativeSelect>
                  </FormControl>
                </div>
              )
            })
          }
        </div>
        <Dialog open={this.state.open} onClose={() => this.setState({ open: false })}>
          <DialogTitle>
            <TextField id="new_button" value={this.state.targetButton && this.state.targetButton.Name} onChange={(event) => this.updateName(event.target.value)} label="ボタンのラベル" />
          </DialogTitle>
          <DialogContent>
            <FormControlLabel
              label="期間を記録"
              control={<Checkbox id={"is_duration_" + this.state.targetButton?.Name} checked={this.state.targetButton?.IsDuration} onChange={(event) => this.updateDuration(event.target.checked)} />}
            />
            <FormControlLabel
              label="追加メモ"
              control={<Checkbox id={"is_duration_" + this.state.targetButton?.Name} checked={this.state.targetButton?.UseMemo} onChange={(event) => this.updateMemo(event.target.checked)} />}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => this.updateButton()} variant="contained" color="primary">保存</Button>
            <Button onClick={() => this.setState({ open: false })} variant="contained">キャンセル</Button>
            {this.state.targetButton && this.state.targetButton!.ID &&
              <Button onClick={() => this.removeButton()} variant="contained" color="secondary">削除</Button>
            }
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Config);
