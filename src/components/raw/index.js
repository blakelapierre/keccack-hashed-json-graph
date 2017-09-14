import { Link } from 'preact-router/match';

import style from './style';

import {Hash} from '../hash';
import renderLinks from '../../util/renderLinks';

const Raw =
  ({hash, data, onClick, ...props}) => (
    <raw onClick={onClick}>
      <table>
        <tbody>
          <tr>
            <td><data>{renderLinks(data, props)}</data></td>
          </tr>
          <tr className={style['info']}>
            <td><Hash hash={hash} {...props} /></td>
          </tr>
        </tbody>
      </table>
    </raw>
  );

export {Raw};