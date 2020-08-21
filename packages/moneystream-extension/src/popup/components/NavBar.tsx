import React from 'react'
import { Link } from 'react-router-dom'

export default class NavBar extends React.Component {
  render() {
    return (
      <>
        <Link to="/">Status</Link>
        &nbsp;
        <Link to="/paytourl">Pay To</Link>
      </>
    )
  }
}