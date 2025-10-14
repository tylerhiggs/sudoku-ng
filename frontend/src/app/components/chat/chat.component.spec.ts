import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom/matchers';
import { expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatComponent } from './chat.component';
import type {
  ChatMessage,
  GameEvent,
} from '@services/collaboration/collaboration.service';

describe('ChatComponent', () => {
  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'test-player-id');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the chat component with player name', async () => {
    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events: [],
        chats: [],
      },
    });

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent("'s Chat");

    // The player name input should exist
    const nameInput = screen.getByDisplayValue('TestPlayer');
    expect(nameInput).toBeInTheDocument();
  });

  it('should allow updating player name and emit debounced event', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const updatePlayerName = vi.fn();

    await render(ChatComponent, {
      inputs: {
        playerName: 'OldName',
        events: [],
        chats: [],
      },
      on: {
        updatePlayerName,
      },
    });

    const nameInput = screen.getByDisplayValue('OldName');
    await user.clear(nameInput);
    await user.type(nameInput, 'NewName');

    expect(updatePlayerName).not.toHaveBeenCalled();

    // Fast-forward time to trigger debounce
    vi.advanceTimersByTime(1000);

    expect(updatePlayerName).toHaveBeenCalledWith('NewName');

    vi.useRealTimers();
  });

  it('should send a message when submit is triggered', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events: [],
        chats: [],
      },
      on: {
        sendMessage,
      },
    });

    const messageInput = screen.getByPlaceholderText('Type a message...');
    await user.type(messageInput, 'Hello, world!');
    await user.keyboard('{Enter}');

    expect(sendMessage).toHaveBeenCalledWith('Hello, world!');
  });

  it('should not send empty messages', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events: [],
        chats: [],
      },
      on: {
        sendMessage,
      },
    });

    const messageInput = screen.getByPlaceholderText('Type a message...');
    await user.type(messageInput, '   ');
    await user.keyboard('{Enter}');

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('should display chat messages', async () => {
    const chatMessages: ChatMessage[] = [
      {
        id: 'msg1',
        playerId: 'player1',
        playerName: 'Alice',
        message: 'Hello everyone!',
        timestamp: Date.now(),
      },
      {
        id: 'msg2',
        playerId: 'player2',
        playerName: 'Bob',
        message: 'Hi Alice!',
        timestamp: Date.now() + 1000,
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events: [],
        chats: chatMessages,
      },
    });

    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('Hi Alice!')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should display playerJoin events', async () => {
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'playerJoin',
        playerId: 'player1',
        playerName: 'Alice',
        timestamp: Date.now(),
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events,
        chats: [],
      },
    });

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/joined the game/)).toBeInTheDocument();
  });

  it('should display playerLeave events', async () => {
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'playerLeave',
        playerId: 'player1',
        playerName: 'Bob',
        timestamp: Date.now(),
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events,
        chats: [],
      },
    });

    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/left the game/)).toBeInTheDocument();
  });

  it('should display cellUpdate events', async () => {
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'cellUpdate',
        playerId: 'player1',
        playerName: 'Alice',
        timestamp: Date.now(),
        r: 3,
        c: 5,
        value: 7,
        note: false,
        delete: false,
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events,
        chats: [],
      },
    });

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/updated/)).toBeInTheDocument();
    expect(screen.getByText(/cell/)).toBeInTheDocument();
    expect(screen.getByText(/at \(3, 5\) to 7/)).toBeInTheDocument();
  });

  it('should display cellUpdate delete events', async () => {
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'cellUpdate',
        playerId: 'player1',
        playerName: 'Alice',
        timestamp: Date.now(),
        r: 2,
        c: 4,
        value: 0,
        note: false,
        delete: true,
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events,
        chats: [],
      },
    });

    expect(screen.getByText(/deleted/)).toBeInTheDocument();
  });

  it('should display note update events', async () => {
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'cellUpdate',
        playerId: 'player1',
        playerName: 'Bob',
        timestamp: Date.now(),
        r: 1,
        c: 1,
        value: 3,
        note: true,
        delete: false,
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events,
        chats: [],
      },
    });

    expect(screen.getByText(/note/)).toBeInTheDocument();
    expect(screen.getByText(/at \(1, 1\) to 3/)).toBeInTheDocument();
  });

  it('should sort and display events and chats by timestamp', async () => {
    const now = Date.now();
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'playerJoin',
        playerId: 'player1',
        playerName: 'Alice',
        timestamp: now,
      },
    ];

    const chats: ChatMessage[] = [
      {
        id: 'msg1',
        playerId: 'player2',
        playerName: 'Bob',
        message: 'Second message',
        timestamp: now + 2000,
      },
      {
        id: 'msg2',
        playerId: 'player1',
        playerName: 'Alice',
        message: 'First message',
        timestamp: now + 1000,
      },
    ];

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events,
        chats,
      },
    });

    const chatMessagesDiv = document.getElementById('chat-messages');
    expect(chatMessagesDiv).toBeInTheDocument();

    const allText = chatMessagesDiv?.textContent || '';

    // Check that events appear in chronological order
    const joinIndex = allText.indexOf('joined');
    const firstMessageIndex = allText.indexOf('First message');
    const secondMessageIndex = allText.indexOf('Second message');

    expect(joinIndex).toBeLessThan(firstMessageIndex);
    expect(firstMessageIndex).toBeLessThan(secondMessageIndex);
  });

  it('should clear message input after sending', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events: [],
        chats: [],
      },
      on: {
        sendMessage,
      },
    });

    const messageInput = screen.getByPlaceholderText(
      'Type a message...',
    ) as HTMLInputElement;
    await user.type(messageInput, 'Test message');
    await user.keyboard('{Enter}');

    expect(sendMessage).toHaveBeenCalledWith('Test message');
    expect(messageInput.value).toBe('');
  });

  it('should allow shift+enter without sending message', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();

    await render(ChatComponent, {
      inputs: {
        playerName: 'TestPlayer',
        events: [],
        chats: [],
      },
      on: {
        sendMessage,
      },
    });

    const messageInput = screen.getByPlaceholderText('Type a message...');
    await user.type(messageInput, 'Test message');
    await user.keyboard('{Shift>}{Enter}{/Shift}');

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
