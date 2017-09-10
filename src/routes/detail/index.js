import { h, Component } from 'preact';
import { Link, route } from 'preact-router/match';

import {Raw} from '../../components/raw';
import {Hash} from '../../components/hash';
import {TabPanel} from '../../components/tabPanel';

import style from './style';

console.log(style);


const Input = ({hash, store, object, route, ...props}) => (
  <detail-input>
    <about>About: <Hash hash={hash} {...props} /></about>
    <inputs>
      <LabeledText object={object} ref={el => this.labeledText = el} />
    </inputs>
    <button onClick={() => store.addData(JSON.stringify(Object.assign({about: `keccak:${hash}`}, object))).then(({hash}) => route(`/keccak/${hash}`))}>Add</button>
  </detail-input>
);

const LabeledText = ({object}) => (
  <labeled-text>
    <table>
      <tbody>
        {Object.keys(object).map(key => (
          <tr>
            <td>{key}:</td>
            <td><textarea onInput={({target: {value}}) => (object[key] = value)} value={object[key]}></textarea></td>
          </tr>
        ))}
      </tbody>
    </table>
  </labeled-text>
);

const typeRenderer = {
  Raw
};

export default class Detail extends Component {
  render (props, {data}) {
    console.log('detail')
    return (
      <detail>
        <View {...props} />
        <Input {...props} object={{'comment': ''}} />
        <Link href="/">&lt;--</Link>
      </detail>
    );
  }
}

class View extends Component {
  constructor(props) {
    super(props);

    const {hash, store} = props;

    this.state = {hash};

    this.load(store, hash, this);
  }

  load(store, hash, scope) {
    setState({loadingData: 'true', loadingAbout: 'true'});

    store.getData(hash)
         .then(data => setState({hash, data, loadingData: 'false'}))
         .catch(error => setState({hash, data: (<span>Not Found!</span>), loadingData: 'error'}));

    store.getAbout(hash)
         .then(about => setState({hash, about, loadingAbout: 'false'}))
         .catch(error => setState({hash, about: undefined, loadingAbout: 'error'}) & console.log(error));

    function setState(...args) {
      return scope.setState.call(scope, ...args);
    }
  }

  render({hash, store, route, ...props}, {data, about = [], loadingData, loadingAbout}) {
    if (hash !== this.state.hash) this.load(store, hash, this);

    const type = 'Raw';

    const referencingProperties = [];

    if (about.length > 0) referencingProperties.push('about');

    console.log(props);

    return (
      <view>
        <info className={style[`loading-${loadingData}`]}>

          {typeRenderer[type]({hash, data, ...props})}
        </info>
        <TabPanel>
          {referencingProperties.map(property => (
            <tab header={`${property} (${about.length})`}>
              {about.map(hash => <View onClick={event => route(`/keccak/${hash}`)} hash={hash} store={store} {...props} />)}
            </tab>
          ))}
        </TabPanel>
      </view>
    );
  }
}


     // {loadingData === 'true' ? <info>true</info> :
     //     loadingData === 'false' ? <info>false</info> :
     //                              <info>error</info>  }