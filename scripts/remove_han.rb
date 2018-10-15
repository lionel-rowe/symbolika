require 'json'

path = './raw_data/unicode_chars.json'

file = File.read(path)

char_arr = JSON.parse(file)

re = /\p{Han}+/

no_cjks = char_arr.reject { |el| el['char'].match? re }

puts "length with CJK: #{char_arr.length}
length without CJK: #{no_cjks.length}"

# File.write('./raw_data/unicode_chars_no_cjk.json', JSON.generate(char_arr))
