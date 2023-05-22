import React from 'react';
import './App.css';
import ChatZone from './ChatZone';
import ContactWindow from './ContactWindow';
import InputZone from './InputZone';

const CommunicationZone = () => {
  const [state, setState] = React.useState({
    value: '',
    disposable: '',
    history: ['How can I help?'],
  });
  const stateRef = React.useRef(state);

  function handleChange(event) {
    setState({
      ...state,
      value: event.target.value,
    });
  }

  function handleSubmit(event) {
    if (event.key === 'Enter') {
      const newState = {
        ...state,
        value: '',
        disposable: event.target.value,
        history: [...state.history, event.target.value],
      };
      setState(newState);
      stateRef.current = newState;

      setTimeout(dialogueEngine, 3000);
    }
    cleanHistory();
  }

  function dialogueEngine() {
    const answersBasic = [
      'can you elaborate?',
      'and why do you believe that is so?',
      'can you be more specific?',
      'what would be your guess?',
      'I need more details for this one',
    ];
    const answersAdvanced = [
      'have you check the logs?',
      'have you tried restarting?',
      'what does the documentation say?',
      'Maybe its a typo',
    ];
    const answersAdjust = [
      'you need to be a bit more specific',
      'come on I am trying to help',
      'whatever',
      'that does not sound like a bug',
    ];

    if (stateRef.current.disposable.length <= 7) {
      let response =
        answersAdjust[Math.floor(Math.random() * answersAdjust.length)];
      setState({
        ...stateRef.current,
        history: [...stateRef.current.history, response],
      });
    } else if (
      stateRef.current.history.length <= 3 &&
      stateRef.current.disposable.length > 6
    ) {
      let response =
        answersBasic[Math.floor(Math.random() * answersBasic.length)];
      setState({
        ...stateRef.current,
        history: [...stateRef.current.history, response],
      });
    } else if (stateRef.current.history.length >= 4) {
      // let response =
      //   answersAdvanced[Math.floor(Math.random() * answersAdvanced.length)];
      // setState({
      //   ...stateRef.current,
      //   history: [...stateRef.current.history, response],
      // });

      var myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      var raw = JSON.stringify({
        "query": stateRef.current.disposable
      });

      var requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw
      };

      fetch("http://localhost:8000/query", requestOptions)
        .then(response => response.text())
        .then(result => {
          let response = JSON.parse(result);
          const { status, data } = response;

          if (status === 400) {
            setState({
              ...stateRef.current,
              history: [...stateRef.current.history, answersAdjust[0]],
            });
          } else if (status === 200) {
            if (data.body) {
              setState({
                ...stateRef.current,
                history: [...stateRef.current.history, parseTextFromMarkDown(String(data.body)).join(' ')],
              });
            } else {
              setState({
                ...stateRef.current,
                history: [...stateRef.current.history, answersAdjust[0]],
              });
            }
          } else {
            let response = answersBasic[Math.floor(Math.random() * answersBasic.length)];
            setState({
              ...stateRef.current,
              history: [...stateRef.current.history, response],
            });
          }
        })
        .catch(error => console.log('error', error));
    }
  }

  function parseTextFromMarkDown(stringInput) {
    const htmlString = stringInput;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const walker = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT);

    const textList = [];
    let currentNode = walker.currentNode;

    while (currentNode) {
      textList.push(currentNode.textContent);
      currentNode = walker.nextNode();
    }

    return textList;
  }

  function cleanHistory() {
    const tempHistory = state.history;
    let newHistory = [];
    if (state.history.length > 12) {
      tempHistory.shift();
      tempHistory.shift();
      newHistory = tempHistory;
      setState({
        ...state,
        history: newHistory,
      });
    }
  }

  return (
    <div className="chatHost innerShadow">
      <ContactWindow />
      <ChatZone chatItem={state.history} />
      <InputZone
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        value={state.value}
      />
    </div>
  );
};

export default CommunicationZone;
