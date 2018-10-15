require 'json'

path = './raw_data/unicode_chars.json'

file = File.open(path, "r").read

char_hash = JSON.parse(file)

re = /\p{Han}+/

p char_hash.length

p char_hash.reject! { |el| el['char'].match? re } .length

File.write('./raw_data/unicode_chars_no_cjk.json', JSON.generate(char_hash))
