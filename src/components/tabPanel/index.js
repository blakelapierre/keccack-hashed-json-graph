import { h, Component } from 'preact';
import style from './style';

class TabPanel extends Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: 0,
      expanded: true
    };
  }

  render({children, className}, {selected, expanded}) {
    return (
      <tab-panel className={style[className]}>
        <headers>
          {children.map(({attributes: { header }}, i) =>
            <selector
              className={selected === i ? style['selected'] : ''}
              onClick={() => this.setState({selected: i, expanded: true})}>
                {selected === i ? <expander onClick={event => this.setState({expanded: !expanded}) & event.stopPropagation()}>{expanded ? '-' : '+'}</expander> : undefined}
                <text>{header}</text>
            </selector>
          )}
        </headers>
        {expanded ? children[selected] : undefined}
      </tab-panel>
    );
  }
}

export {TabPanel};