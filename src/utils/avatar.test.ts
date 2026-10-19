import { avatarLetters } from './avatar'

describe('avatarLetters', () => {
  it('инициалы из имени', () => {
    expect(avatarLetters({ name: 'Анна Смирнова' })).toBe('АС')
    expect(avatarLetters({ name: 'мария' })).toBe('М')
  })

  it('имя важнее никнейма', () => {
    expect(avatarLetters({ name: 'Анна', username: '@evgeniy' })).toBe('А')
  })

  it('без имени — первая буква никнейма', () => {
    expect(avatarLetters({ username: '@evgeniy_varlamov' })).toBe('E')
  })

  it('никнейм с цифрами и подчёркиванием в начале — первая буква', () => {
    expect(avatarLetters({ username: '@_1qwerty' })).toBe('Q')
  })

  it('цифры номера не используются — значок', () => {
    expect(avatarLetters({ name: '+7 917 137-00-14' })).toBeNull()
    expect(avatarLetters({})).toBeNull()
  })
})
