import {Hash} from '../components/hash';

export default renderLinks;

function renderLinks(text = '', props) {
  const regexp = /(ftp|http|https|keccak):(\/\/)?([^ "]+)/ig,
        result = [];

  let match;
  while ((match = regexp.exec(text)) !== null) {

    const index = text.indexOf(match[0]),
          protocol = match[1],
          prev = text.substring(0, index),
          next = text.substring(index + match[0].length);

    result.push(prev);

    if (protocol === 'keccak') result.push(<Hash {...props} hash={match[3]} />);
    else result.push(<a href={match[0]} onClick={event => event.stopPropagation()} target="linkIframe">{match[0]}</a>);

    text = next;
  }

  result.push(text);

  return result;
}