import { h, Component } from 'preact';

import style from './style';

import {ColorHash} from '../hash';

import renderLinks from '../../util/renderLinks';


export {Json};

function Json (props) {
  const {references, hash} = props,
        keys = references[hash] || {};

  return (
    <json onClick={props.onClick}>
      <KeyValues {...props} />
      <lower>
        <ColorHash {...props} />
        <references>
        {Object.keys(keys).map(key => <reference><key>{key}</key> <count>{keys[key]}</count></reference>)}
        </references>
      </lower>
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