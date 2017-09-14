import { h, Component } from 'preact';

import style from './style';

import {ColorHash} from '../hash';

import renderLinks from '../../util/renderLinks';


export {Json};

function Json (props) {
  const {references, hash} = props;

  return (
    <json onClick={props.onClick}>
      <KeyValues {...props} />
      <ColorHash {...props} />
      {JSON.stringify(references[hash])}
    </json>
  );
}

function KeyValues({obj, ...props}) {
  return (
    <key-values>
      {Object.keys(obj).map(key => (
        <key-value>
          <value>{renderValue(obj[key], props)}</value>
          <key><span>{key}</span></key>
        </key-value>
      ))}
    </key-values>
  );
}

function renderValue(value, props) {
  switch (typeof value) {
    case 'object':
      return <KeyValues {...props} obj={value} />
      break;
    case 'string':
      return renderLinks(value, props);
      break;
    default:
      return value;
  }
}