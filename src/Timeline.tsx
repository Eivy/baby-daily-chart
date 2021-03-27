import 'date-fns';
import path from 'path';
import React from 'react';
import { connect } from 'react-redux';
import Chart from 'react-google-charts';
import { State } from './states';
import { Actions, mapDispatchToProps, mapStateToProps } from './dispatcher';
import { Button, IconButton, TextField,  Dialog, DialogActions, DialogTitle, DialogContent, Table, TableHead, TableBody, TableRow, TableCell } from '@material-ui/core';
import { Delete, Edit } from '@material-ui/icons';
import * as datepicker from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import * as fire from 'firebase';

declare var firebase: typeof fire;

type Props = State & Actions;

interface LocalState {
  babies: Baby[];
  buttons: Button[];
  timeline: Happen[];
  date: Date | null;
  open: boolean;
  openUpdate: boolean;
  updateID: string;
  target_button: Button | null;
  target_baby: string;
  memo: string | null;
}

class Timeline extends React.Component<Props, LocalState> {

  babySub: any; // () => void
  buttonSub: any; // () => void
  timelineSub: any; // () => void

  constructor(props: Props) {
    super(props);
    this.datePickerChanged = this.datePickerChanged.bind(this);
    const date = new Date();
    this.state = {
      babies: [],
      buttons: [],
      timeline: [],
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      open: false,
      openUpdate: false,
      updateID: '',
      target_button: null,
      target_baby: '',
      memo: null,
    };
  }

  componentDidMount() {
    const firestore = firebase.firestore();
    const doc = firestore.doc(path.join('Users', this.props.user));
    this.babySub = doc.collection('baby').onSnapshot((snapshot) => {
      let babies: Baby[] = [];
      snapshot.forEach((v) => babies.push(Object.assign(v.data(), {ID: v.id}) as Baby));
      this.setState({babies});
    });
    this.buttonSub = doc.collection('button').onSnapshot((snapshot) => {
      let buttons: Button[] = [];
      snapshot.forEach((v) => buttons.push(Object.assign(v.data(), {ID: v.id}) as Button));
      this.setState({buttons});
    });
    this.updateChart();
  }

  componentWillUnmount() {
    if (this.babySub) this.babySub();
    if (this.buttonSub) this.buttonSub();
    if (this.timelineSub) this.timelineSub();
  }

  componentDidUpdate(prev: Props, state: LocalState) {
    if (state.date !== this.state.date) {
      this.updateChart();
    }
  }

  toHappen(data: any, id?: string): Happen {
    return {
      ID: id,
      Baby: data.Baby,
      Label: data.Label,
      Memo: data.Memo,
      Start: data.Start.toDate(),
      End: data.End === '-' ? data.End : data.End.toDate(),
    }
  }

  updateChart() {
    if (this.timelineSub) this.timelineSub();
    const firestore = firebase.firestore();
    const doc = firestore.doc(path.join('Users', this.props.user));
    this.setState({timeline: []});
    const date = this.state.date!;
    const before_week = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
    const after_week = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    const date_end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    this.timelineSub = doc.collection('timeline').where('Start', '>=', before_week).where('Start', '<=', after_week).onSnapshot((snapshot) => {
      let timeline: Happen[] = this.state.timeline;
      snapshot.docChanges().forEach((v) => {
        let d = v.doc.data();
        if (d.Start.toDate() > date_end || (d.End !== '-' && d.End.toDate() < date)) {
          return;
        }
        if (v.type === 'added') {
          if (!timeline.find((t) => t.ID === v.doc.id)) {
            let o = this.toHappen(d);
            o.ID = v.doc.id;
            timeline.push(o);
            let map = new Map(timeline.map((d) => [d.ID, d]));
            timeline = Array.from(map.values());
          }
        }
        if (v.type === 'modified') {
          timeline = timeline.filter((t) => t.ID !== v.doc.id);
          let o = this.toHappen(d);
          o.ID = v.doc.id;
          timeline.push(o);
        }
        if (v.type === 'removed') {
          timeline = timeline.filter((t) => t.ID !== v.doc.id);
        }
      });
      this.setState({timeline});
    });
  }

  async NewHappen(event: any, button: Button, baby: string) {
    const target = (event.target as HTMLInputElement);
    target.disabled = true;
    const exist = await firebase.firestore().collection(path.join('Users', this.props.user, 'timeline')).where('Baby', '==', baby).where('Label', '==', button.Name).where('End', '==', '-').get();
    if (exist.empty && button.UseMemo && !this.state.memo) {
      this.setState({target_button: button, target_baby: baby, open: true});
      return;
    }
    try {
      if (button.IsDuration) {
        if (exist.empty) {
          await firebase.firestore().collection(path.join('Users', this.props.user, 'timeline')).add({Baby: baby, Label: button.Name, Memo: this.state.memo, Start: new Date(), End: '-'});
        } else {
          exist.forEach(async (v) => {
            await firebase.firestore().doc(path.join('Users', this.props.user, 'timeline', v.id)).update({End: new Date()});
          });
        }
      } else {
        await firebase.firestore().collection(path.join('Users', this.props.user, 'timeline')).add({Baby: baby, Label: button.Name, Memo: this.state.memo, Start: new Date(), End: new Date()});
      }
    }
    finally {
      target.disabled = false;
      this.setState({target_button: null, target_baby: '', memo: null, open: false});
    }
  }

  updateMemo(memo: string) {
    this.setState({memo});
  }

  datePickerChanged(date: any) {
    this.setState({date});
  }

  removeHappen(id: string | undefined) {
    const firestore = firebase.firestore();
    if (!id) {
      return;
    }
    if (window.confirm('本当に削除しますか?')) {
      try {
        firestore.doc(path.join('Users', this.props.user, 'timeline', id!)).delete();
      }
      catch (e) {
        alert('失敗しました\n' + e);
      }
    }
  }

  updateHappen(id: string | undefined, propName: 'Start' | 'End' | 'Memo', value: any) {
    const firestore = firebase.firestore();
    if (!id) {
      return;
    }
    try {
      const obj = this.state.timeline!.find(t => t.ID === id);
      if (!obj) return;
      switch(propName) {
      case 'Start':
        obj.Start = value;
        break;
      case 'End':
        obj.End = value;
        break;
      case 'Memo':
        obj.Memo = value;
        break;
      }
      firestore.doc(path.join('Users', this.props.user, 'timeline', id!)).update(obj);
    }
    catch (e) {
      alert('失敗しました\n' + e);
    }
    finally {
      this.setState({openUpdate: false});
    }
  }

  openUpdateMemo(id: string | undefined) {
    this.setState({updateID: id!, openUpdate: true});
  }

  render() {
    const date = this.state.date!;
    const tomorrow = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    return (
    <div>
      <div id="buttons">
      {
        this.state.babies?.map((b: Baby) => {
          return (
          <div key={b.ID}>
            <span>{b.Name}</span>
            {
              this.state.buttons.filter((v) => v.For === undefined || v.For === '' || v.For === b.ID).map((v) => {
                let color : 'default' | 'primary' = 'default';
                if (v.IsDuration && this.state.timeline.filter((t) => t.Baby === b.Name && t.Label === v.Name && t.End === '-').length > 0) {
                  color = 'primary';;
                }
                return (
                  <Button variant="contained"  key={v.ID} color={color} onClick={(event) => this.NewHappen(event, v, b.Name)}>
                    {v.Name}
                  </Button>
                );
              })
            }
          </div>
          )
        })
      }
      </div>
      <hr/>
      <div style={{height: "3em"}}></div>
      <datepicker.MuiPickersUtilsProvider utils={DateFnsUtils}>
      <datepicker.DatePicker
        autoOk
        variant="inline"
        format="yyyy/MM/dd"
        openTo="date"
        value={this.state.date!}
        onChange={this.datePickerChanged}
      />
      <Chart
        chartType="Timeline"
        options={{hAxis: { minValue: this.state.date, maxValue: tomorrow }}}
        data={[
          [{ type: 'string', id: 'Name' },{ type:'string', id : 'Action' },{ type: 'string', role: 'tooltip'},{ type: 'date', id: 'Start' },{ type: 'date', id: 'End' }],
          ...this.state.timeline?.map(happen => [happen.Baby, happen.Label, happen.Memo, happen.Start, happen.End === '-' ? new Date() : happen.End])
        ]}
      />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ラベル</TableCell>
            <TableCell>開始時間</TableCell>
            <TableCell>終了時間</TableCell>
            <TableCell>メモ</TableCell>
            <TableCell>削除</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
        {
          this.state.timeline?.sort((i, j) => i.Start.getUTCDate()  - j.Start.getUTCDate()).map(t=> {
          return (
            <TableRow key={t.ID} >
              <TableCell>{t.Label}</TableCell>
              <TableCell><datepicker.DateTimePicker format="hh:mm a" value={t.Start} onChange={(date: Date | null) => this.updateHappen(t.ID, 'Start', date)}/></TableCell>
              <TableCell>{t.End === '-' ? '-' : <datepicker.DateTimePicker format="hh:mm a" value={t.End} onChange={(date: Date | null) => this.updateHappen(t.ID, 'End', date)}/>}</TableCell>
              <TableCell>{t.Memo}<IconButton onClick={(e) => this.openUpdateMemo(t.ID)}><Edit /></IconButton></TableCell>
              <TableCell><IconButton color="secondary" onClick={() => this.removeHappen(t.ID)} ><Delete/></IconButton></TableCell>
            </TableRow>
          );
          })
        }
        </TableBody>
      </Table>
      </datepicker.MuiPickersUtilsProvider>
      <Dialog open={this.state.open} onClose={() => this.setState({open: false})}>
        <DialogTitle>メモ</DialogTitle>
        <DialogContent>
          <TextField id="memo" onChange={(event) => this.updateMemo(event.target.value)} label="追加メモ" />
        </DialogContent>
        <DialogActions>
          <Button onClick={(event) => this.NewHappen(event, this.state.target_button!, this.state.target_baby)} variant="contained" color="primary">保存</Button>
          <Button onClick={() => this.setState({open: false})} variant="contained">キャンセル</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={this.state.openUpdate} onClose={() => this.setState({open: false})}>
        <DialogTitle>メモ</DialogTitle>
        <DialogContent>
          <TextField id="memo_update" onChange={(event) => this.updateMemo(event.target.value)} defaultValue={this.state.timeline!.find(h => h.ID === this.state.updateID)?.Memo} label="追加メモ" />
        </DialogContent>
        <DialogActions>
          <Button onClick={(event) => this.updateHappen(this.state.updateID, 'Memo', (document.getElementById('memo_update') as HTMLInputElement).value)} variant="contained" color="primary">保存</Button>
          <Button onClick={() => this.setState({openUpdate: false})} variant="contained">キャンセル</Button>
        </DialogActions>
      </Dialog>
    </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Timeline);
