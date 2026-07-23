#!/usr/bin/env ruby
# Parchea ios/PulpoLive/Info.plist con el URL scheme de Google Sign-In (iOS).
# - Sin GOOGLE_IOS_CLIENT_ID: elimina entradas googlesignin / placeholder inválidas.
# - Con GOOGLE_IOS_CLIENT_ID: añade o actualiza com.googleusercontent.apps.<id>.
#
# Uso: ruby scripts/patch_google_ios_url_scheme.rb
# (Fastfile lo invoca antes de build_app; lee env/.env_main.)

require "rexml/document"

project_root = File.expand_path("..", __dir__)

def load_env_file(path)
  return unless File.exist?(path)

  File.readlines(path, chomp: true).each do |line|
    line = line.strip
    next if line.empty? || line.start_with?("#")

    key, value = line.split("=", 2)
    next unless key && !key.empty?

    ENV[key] ||= value.to_s.strip
  end
end

load_env_file(File.join(project_root, ".env"))
load_env_file(File.join(project_root, "env", ".env_main"))

info_plist_path = File.join(project_root, "ios/PulpoLive/Info.plist")
ios_client_id = ENV.fetch("GOOGLE_IOS_CLIENT_ID", "").strip

def reversed_google_url_scheme(ios_client_id)
  match = ios_client_id.match(/\A(?<client_part>.+)\.apps\.googleusercontent\.com\z/)
  unless match
    warn "GOOGLE_IOS_CLIENT_ID inválido: #{ios_client_id.inspect}"
    exit 1
  end
  "com.googleusercontent.apps.#{match[:client_part]}"
end

def load_plist(path)
  File.open(path) { |f| REXML::Document.new(f) }
rescue StandardError => e
  warn "No se pudo leer #{path}: #{e.message}"
  exit 1
end

def save_plist(doc, path)
  formatter = REXML::Formatters::Pretty.new(2)
  formatter.compact = true
  File.open(path, "w") do |f|
    f.write(%(<?xml version="1.0" encoding="UTF-8"?>\n))
    f.write(%(<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n))
    formatter.write(doc.root, f)
    f.write("\n")
  end
end

def url_types_array(doc)
  root = doc.root
  url_types = root.elements.to_a("dict/key").find { |k| k.text == "CFBundleURLTypes" }
  return nil unless url_types

  idx = url_types.parent.index(url_types) + 1
  url_types.parent.elements[idx]
end

def google_url_type_dict(url_types_array)
  url_types_array.elements.to_a("dict").find do |dict|
    name_key = dict.elements.to_a("key").find { |k| k.text == "CFBundleURLName" }
    name_key && name_key.next_element&.text == "com.pulpolive.googlesignin"
  end
end

def placeholder_google_dict(url_types_array)
  url_types_array.elements.to_a("dict").find do |dict|
    schemes = dict.elements.to_a("key").find { |k| k.text == "CFBundleURLSchemes" }
    next false unless schemes

    arr = schemes.parent.index(schemes) + 1
    scheme_array = schemes.parent.elements[arr]
    scheme_array&.elements.to_a("string").any? do |s|
      s.text&.include?("PLACEHOLDER") || s.text&.include?("_")
    end
  end
end

def remove_dict(url_types_array, dict)
  return unless dict

  url_types_array.delete_element(dict)
end

def upsert_google_scheme(url_types_array, scheme)
  dict = google_url_type_dict(url_types_array)
  unless dict
    dict = REXML::Element.new("dict")
    url_types_array.add_element(dict)
    dict.add_element("key").text = "CFBundleURLName"
    dict.add_element("string").text = "com.pulpolive.googlesignin"
    dict.add_element("key").text = "CFBundleURLSchemes"
    schemes_array = REXML::Element.new("array")
    dict.add_element(schemes_array)
    schemes_array.add_element("string").text = scheme
    return
  end

  schemes_key = dict.elements.to_a("key").find { |k| k.text == "CFBundleURLSchemes" }
  idx = dict.index(schemes_key) + 1
  schemes_array = dict.elements[idx]
  string_el = schemes_array.elements["string"]
  if string_el
    string_el.text = scheme
  else
    schemes_array.add_element("string").text = scheme
  end
end

doc = load_plist(info_plist_path)
url_types = url_types_array(doc)

unless url_types
  warn "CFBundleURLTypes no encontrado en Info.plist"
  exit 1
end

if ios_client_id.empty?
  removed = google_url_type_dict(url_types) || placeholder_google_dict(url_types)
  if removed
    remove_dict(url_types, removed)
    save_plist(doc, info_plist_path)
    puts "Info.plist: eliminado URL scheme de Google (GOOGLE_IOS_CLIENT_ID vacío)."
  else
    puts "Info.plist: sin URL scheme de Google que limpiar."
  end
else
  scheme = reversed_google_url_scheme(ios_client_id)
  remove_dict(url_types, placeholder_google_dict(url_types))
  upsert_google_scheme(url_types, scheme)
  save_plist(doc, info_plist_path)
  puts "Info.plist: URL scheme de Google actualizado (#{scheme})."
end
