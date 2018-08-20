import React from 'react';

const Arrow = (props) => {

  return (
    <button
      className='pagination-arrow'
      onClick={() => props.increment(props.incVal)}
      tabIndex={0}
    >
      {props.content}
    </button>
  );

}

export default class Pagination extends React.Component {

  render() {
    return (

      <div
        className='pagination'
      >
        <Arrow content='«' increment={modifier => this.props.changePage(modifier)} incVal={-1} />
        <span className='pagination-text'>
          {' Page '}
          {this.props.pageIdx + 1}
          {' of '}
          {this.props.totalPages}
          {' '}
        </span>
        <Arrow content='»' increment={modifier => this.props.changePage(modifier)} incVal={+1} />
        
      </div>

    );
  }

}
