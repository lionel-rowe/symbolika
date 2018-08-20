import React from 'react';

export default class CloseButton extends React.Component {

  render() {
    return (
      <span
        role='button'
        aria-label='close'
        className='closeButton'
        tabIndex={0}
        onClick={this.props.closeAction}
        onKeyDown={e => {
          if ((e.key) === 'Enter') this.props.closeAction()
        }}
      >
        <span className='innerCloseButton'>×</span>
      </span>
    );
  }
}
