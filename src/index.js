import { render, Component, React } from './react-fiber-simple';

class App extends Component {
    constructor(props) {
      super(props)
      this.state = {
        info: false
      }
      setTimeout(() => {
        this.setState({
          info: !this.state.info
        })
      }, 3000)
    }

    render() {
      return (
        <div>
          <p>hello</p>
          <p>luy</p>
          <div>{this.state.info ? '三秒之后变化' : '嘿嘿，我变啦'}</div>
        </div>
      )
    }
  }
  render(<App />, document.getElementById('root'))