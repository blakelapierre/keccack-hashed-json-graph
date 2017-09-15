import { h, Component } from 'preact';
import { Link, route } from 'preact-router/match';

import {Raw} from '../../components/raw';
import {Json} from '../../components/json';
import {Hash} from '../../components/hash';
import {TabPanel} from '../../components/tabPanel';

import style from './style';


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
  Raw,
  Json
};

export default class Detail extends Component {
  render (props, {data}) {
    console.log('detail', props)
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
    setState({loadingData: 'true', loadingAbout: 'true', loadingHash: hash});

    store.getData(hash)
         .then(data => setState({hash, data, loadingData: 'false'}))
         .catch(error => setState({hash, data: (<span>Not Found!</span>), loadingData: 'error'}));

    store.getJsonReferences(hash)
         .then(references => setState({hash, references}))
         .catch(error => setState({hash, references: undefined}) & console.log(error));

    // store.getAbout(hash)
    //      .then(about => setState({hash, about, loadingAbout: 'false'}))
    //      .catch(error => setState({hash, about: undefined, loadingAbout: 'error'}) & console.log(error));

    function setState(...args) {
      return scope.setState.call(scope, ...args);
    }
  }

  render({hash, hashFnName, store, route, ...props}, {data, about = [], loadingData, loadingAbout, references = {}}) {
    if (hash !== this.state.loadingHash) this.load(store, hash, this);

    let type = 'Raw';

    try {
      props.obj = JSON.parse(data);
      type = 'Json';
    }
    catch(e) {}

    const referencingProperties = [];

    if (about.length > 0) referencingProperties.push('about');

    console.log('hashFnName', hashFnName);

    return (
      <view>
        <info className={style[`loading-${loadingData}`]} onClick={() => route(`/${hashFnName}/${hash}`)}>
          {typeRenderer[type]({hash, hashFnName, store, route, data, references, ...props})}
        </info>
        <TabPanel>
          {Object.keys(references).map(referenceKey => (
            <tab header={`${referenceKey} (${references[referenceKey]})`}>
              <Reference {...{referenceKey, hash, hashFnName, store, route, count: references[referenceKey], ...props}} />
            </tab>
          ))}
        </TabPanel>
      </view>
    );
  }
}

class Reference extends Component {
  state = {
    referenceKey: undefined,
    count: 0
  }

  load(store, hash, referenceKey, scope) {
    console.log('loading', hash, referenceKey);
    store.getReferencesByKey(hash, referenceKey)
         .then(references => setState({referenceKey, references, error: undefined}))
         .catch(error => setState({referenceKey, error, references: undefined}));

    function setState(...args) {
      return scope.setState.call(scope, ...args);
    }
  }

  render({referenceKey, count, hash, store, ...props}, {references = []}) {
    console.log(referenceKey, count, store, references);
    if (referenceKey !== this.state.referenceKey) this.load(store, hash, referenceKey, this);

    return (
      <reference>
        {references.map(hash => <View hash={hash} store={store} {...props} />)}
      </reference>
    );
  }
}
    // {references[reference].map(hash => <View onClick={event => route(`/keccak/${hash}`)} hash={hash} store={store} {...props} />)}


     // {loadingData === 'true' ? <info>true</info> :
     //     loadingData === 'false' ? <info>false</info> :
     //                              <info>error</info>  }